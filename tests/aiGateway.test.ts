import { test } from "node:test";
import assert from "node:assert/strict";
import { createModelResolver } from "../src/lib/aiGateway/modelResolver";
import { createAIGateway, type AIRequestContext } from "../src/lib/aiGateway";
import type { UsageStart, UsageFinish } from "../src/lib/aiGateway/usageTypes";

test("gateway uses the managed key, preserves embeddings, streams text and exposes actual usage", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-managed-key";
  const requests: string[] = [];
  const starts: UsageStart[] = [];
  const finishes: UsageFinish[] = [];
  const { embedText, generateResponse, resolveProvider } = createAIGateway({
    async start(event) { starts.push(event); }, async finish(_id, event) { finishes.push(event); },
  });
  const context: AIRequestContext = { orgId: "org-id", userId: "owner-id", sessionId: "session-id", surface: "chat", task: "generation" };
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request.url);
    assert.equal(request.headers.get("x-goog-api-key"), "test-managed-key");
    if (request.url.includes(":embedContent")) {
      return Response.json({ embedding: { values: [0.1, 0.2, 0.3] } });
    }
    const completion = {
      candidates: [{ content: { role: "model", parts: [{ text: "Hello" }] }, finishReason: "STOP" }],
      usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 2, totalTokenCount: 9 },
    };
    if (request.url.includes(":streamGenerateContent")) {
      const body = await request.json();
      assert.equal(body.systemInstruction.parts[0].text, "Business rules");
      assert.equal(body.contents[0].parts[0].text, "Hi");
      return new Response(`data: ${JSON.stringify(completion)}\n\n`, {
        headers: { "Content-Type": "text/event-stream" },
      });
    }
    return Response.json(completion);
  };
  try {
    assert.deepEqual(await embedText("Knowledge", context), [0.1, 0.2, 0.3]);
    const provider = await resolveProvider(context);
    assert.deepEqual(provider, { mode: "managed", provider: "google", model: "gemini-3.1-flash-lite" });
    const result = generateResponse({ provider, context, system: "Business rules", messages: [{ role: "user", content: "Hi" }] });
    const response = result.toUIMessageStreamResponse();
    assert.match(response.headers.get("content-type") ?? "", /text\/event-stream/);
    const stream = await response.text();
    assert.match(stream, /text-delta/);
    assert.match(stream, /Hello/);
    const usage = await result.totalUsage;
    assert.equal(usage.inputTokens, 7);
    assert.equal(usage.outputTokens, 2);
    assert.equal(requests.length, 3);
    assert.match(requests[0], /gemini-embedding-001:embedContent/);
    assert.deepEqual(starts.map(event => event.operation), ["embedding", "probe", "generation"]);
    assert.ok(starts.every(event => event.context.orgId === "org-id"));
    assert.equal(finishes[0].tokensTotal, null);
    assert.equal(finishes[2].tokensTotal, 9);
    delete process.env.GEMINI_API_KEY;
    await assert.rejects(resolveProvider(context), /Managed AI is not configured/);
    await assert.rejects(embedText("Knowledge", context), /Managed AI is not configured/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});

test("fallback is cached for 30 minutes, then probed again", async () => {
  let time = 0;
  const calls: string[] = [];
  const resolver = createModelResolver({
    candidates: ["primary", "fallback"], now: () => time,
    probe: async model => { calls.push(model); if (model === "primary") throw Error("unavailable"); },
  });
  assert.equal(await resolver.resolve(), "fallback");
  time = 30 * 60 * 1000 - 1;
  assert.equal(await resolver.resolve(), "fallback");
  assert.deepEqual(calls, ["primary", "fallback"]);
  time += 1;
  assert.equal(await resolver.resolve(), "fallback");
  assert.deepEqual(calls, ["primary", "fallback", "primary", "fallback"]);
});

test("concurrent requests share probes", async () => {
  let calls = 0;
  const resolver = createModelResolver({ candidates: ["primary"], probe: async () => { calls++; } });
  assert.deepEqual(await Promise.all([resolver.resolve(), resolver.resolve(), resolver.resolve()]),
    ["primary", "primary", "primary"]);
  assert.equal(calls, 1);
});

test("failed discovery can recover without waiting for cache expiry", async () => {
  let unavailable = true;
  const resolver = createModelResolver({
    candidates: ["primary"], probe: async () => { if (unavailable) throw Error("offline"); },
  });
  await assert.rejects(resolver.resolve(), /All candidate Gemini models/);
  unavailable = false;
  assert.equal(await resolver.resolve(), "primary");
});

test("stream failure invalidation forces fresh discovery", async () => {
  let calls = 0;
  const resolver = createModelResolver({ candidates: ["primary"], probe: async () => { calls++; } });
  await resolver.resolve();
  resolver.invalidate();
  await resolver.resolve();
  assert.equal(calls, 2);
});

test("an invalidated in-flight probe cannot overwrite the new cache", async () => {
  let release!: () => void;
  let primaryCalls = 0;
  const resolver = createModelResolver({
    candidates: ["primary", "fallback"],
    probe: async model => {
      if (model !== "primary") return;
      primaryCalls++;
      if (primaryCalls === 1) await new Promise<void>(resolve => { release = resolve; });
      else throw Error("primary unavailable");
    },
  });
  const stale = resolver.resolve();
  resolver.invalidate();
  assert.equal(await resolver.resolve(), "fallback");
  release();
  assert.equal(await stale, "primary");
  assert.equal(await resolver.resolve(), "fallback");
  assert.equal(primaryCalls, 2);
});
