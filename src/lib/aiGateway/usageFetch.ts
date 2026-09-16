import { randomUUID } from "node:crypto";
import type { UsageFinish, UsageStart, UsageStore } from "./usageTypes";

const unknownTokens = () => ({ tokensIn: null, tokensOut: null, tokensTotal: null, tokensCached: null, tokensReasoning: null });
const tokenCount = (value: unknown): number | null => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;

/** Read only numeric usage metadata. Never persist prompts, replies, headers or keys. */
export function providerTokens(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("usageMetadata" in payload)) return null;
  const usage = payload.usageMetadata;
  if (!usage || typeof usage !== "object") return null;
  const values = usage as Record<string, unknown>;
  return {
    tokensIn: tokenCount(values.promptTokenCount), tokensOut: tokenCount(values.candidatesTokenCount),
    tokensTotal: tokenCount(values.totalTokenCount), tokensCached: tokenCount(values.cachedContentTokenCount),
    tokensReasoning: tokenCount(values.thoughtsTokenCount),
  };
}

/** One durable row per HTTP attempt, including SDK retries. Store before sending. */
export function usageFetch(store: UsageStore, event: Omit<UsageStart, "id">, fetcher: typeof fetch = globalThis.fetch): typeof fetch {
  return async (input, init) => {
    const id = randomUUID();
    await store.start({ id, ...event }); // Fail closed if request accounting is unavailable.
    let finalized = false;
    let httpStatus: number | null = null;
    let tokens: Pick<UsageFinish, "tokensIn" | "tokensOut" | "tokensTotal" | "tokensCached" | "tokensReasoning"> = unknownTokens();
    async function finish(status: UsageFinish["status"]) {
      if (finalized) return;
      finalized = true;
      try { await store.finish(id, { status, httpStatus, ...tokens }); }
      catch {
        // The durable pending row remains an explicit accounting gap for reconciliation.
        // Do not retry a completed provider call or hide its failure behind a logging error.
        console.error("[ai usage] Finalization failed; pending request:", id);
      }
    }
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    let response: Response;
    try { response = await fetcher(input, init); }
    catch (error) { await finish(signal?.aborted ? "cancelled" : "failed"); throw error; }
    httpStatus = response.status;

    if (!response.headers.get("content-type")?.includes("text/event-stream") || !response.body) {
      let valid = false;
      try {
        const payload = await response.clone().json();
        tokens = providerTokens(payload) ?? tokens;
        valid = !payload?.error;
      } catch { /* Provider didn't return parseable usage; keep null, never manufacture zero. */ }
      await finish(signal?.aborted ? "cancelled" : response.ok && valid ? "succeeded" : "failed");
      return response;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    let streamError = false;
    let terminal = false;
    function inspect(text: string, end = false) {
      pending += text;
      const lines = pending.split("\n");
      pending = end ? "" : lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const payload = JSON.parse(line.slice(5).trim());
          const reported = providerTokens(payload);
          if (reported) {
            // Usage is cumulative; retain earlier fields when later chunks omit them.
            for (const key of Object.keys(reported) as (keyof typeof tokens)[]) {
              if (reported[key] !== null) tokens[key] = reported[key];
            }
          }
          if (payload?.candidates?.some((candidate: { finishReason?: string }) => candidate.finishReason) || payload?.promptFeedback?.blockReason) terminal = true;
          if (payload?.error) streamError = true;
        } catch { /* SSE comments and terminal sentinels are not usage events. */ }
      }
      // No unlimited response buffering, even if an upstream sends malformed SSE.
      if (pending.length > 1024 * 1024) { pending = ""; streamError = true; }
    }
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { value, done } = await reader.read();
          if (done) {
            inspect(decoder.decode(), true);
            await finish(streamError || !response.ok || !terminal ? "failed" : "succeeded");
            controller.close();
          } else {
            inspect(decoder.decode(value, { stream: true }));
            controller.enqueue(value);
          }
        } catch (error) {
          await finish(signal?.aborted ? "cancelled" : "failed");
          controller.error(error);
        }
      },
      async cancel(reason) {
        try { await reader.cancel(reason); } finally { await finish("cancelled"); }
      },
    });
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
}
