import { test } from "node:test";
import assert from "node:assert/strict";
import { usageFetch, providerTokens } from "../src/lib/aiGateway/usageFetch";
import type { UsageStart, UsageFinish, UsageStore } from "../src/lib/aiGateway/usageTypes";

const event = { context: { orgId: "org-id", surface: "widget" as const, task: "generation" as const, sessionId: "session-id" }, model: "test-model", operation: "generation" as const };
function fixture(fetcher: typeof fetch) {
  const starts: UsageStart[] = [];
  const finishes: { id: string; event: UsageFinish }[] = [];
  const store: UsageStore = { async start(value) { starts.push(value); }, async finish(id, value) { finishes.push({ id, event: value }); } };
  return { starts, finishes, store, fetch: usageFetch(store, event, fetcher) };
}

test("usage is persisted before HTTP; JSON tokens remain provider reported", async () => {
  const app = fixture(async () => {
    assert.equal(app.starts.length, 1);
    return Response.json({ usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 2, thoughtsTokenCount: 3, totalTokenCount: 12 } });
  });
  await app.fetch("https://provider.example");
  assert.equal(app.finishes.length, 1);
  assert.equal(app.starts[0].id, app.finishes[0].id);
  assert.equal(app.finishes[0].event.tokensTotal, 12);
  assert.equal(app.finishes[0].event.tokensReasoning, 3);
  assert.equal(app.finishes[0].event.status, "succeeded");
  assert.equal(app.starts[0].context.orgId, "org-id");
});

test("embeddings with no usage are unknown, not zero", async () => {
  const app = fixture(async () => Response.json({ embedding: { values: [1, 2] } }));
  await app.fetch("https://provider.example");
  assert.equal(app.finishes[0].event.tokensIn, null);
  assert.equal(app.finishes[0].event.tokensTotal, null);
  assert.equal(app.finishes[0].event.status, "succeeded");
});

test("split SSE is unchanged and cumulative usage is not added twice", async () => {
  const text = 'data: {"usageMetadata":{"promptTokenCount":7,"totalTokenCount":9}}\r\n\r\n' +
    'data: {"candidates":[{"finishReason":"STOP","content":{"parts":[{"text":"नमस्ते"}]}}],"usageMetadata":{"candidatesTokenCount":2,"totalTokenCount":9}}\n\n';
  const bytes = new TextEncoder().encode(text);
  const app = fixture(async () => new Response(new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7));
    controller.close();
  } }), { headers: { "content-type": "text/event-stream" } }));
  const response = await app.fetch("https://provider.example");
  assert.equal(await response.text(), text);
  assert.equal(app.finishes.length, 1);
  assert.equal(app.finishes[0].event.tokensIn, 7);
  assert.equal(app.finishes[0].event.tokensOut, 2);
  assert.equal(app.finishes[0].event.tokensTotal, 9);
  assert.equal(app.finishes[0].event.status, "succeeded");
});

test("cancelled streams finalize once and cancel the upstream reader", async () => {
  let cancelled = false;
  const app = fixture(async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('data: {"usageMetadata":{"promptTokenCount":4}}\n\n')); },
    cancel() { cancelled = true; },
  }), { headers: { "content-type": "text/event-stream" } }));
  const response = await app.fetch("https://provider.example");
  const reader = response.body!.getReader();
  await reader.read();
  await reader.cancel();
  assert.equal(cancelled, true);
  assert.equal(app.finishes.length, 1);
  assert.equal(app.finishes[0].event.status, "cancelled");
  assert.equal(app.finishes[0].event.tokensIn, 4);
  assert.equal(app.finishes[0].event.tokensTotal, null);
});

test("truncated and provider-error streams are failures even with HTTP 200", async () => {
  for (const text of ['data: {"candidates":[{"content":{"parts":[{"text":"partial"}]}}]}\n\n', 'data: {"error":{"message":"failure"}}\n\n']) {
    const app = fixture(async () => new Response(text, { headers: { "content-type": "text/event-stream" } }));
    await (await app.fetch("https://provider.example")).text();
    assert.equal(app.finishes[0].event.status, "failed");
  }
});

test("network errors and pre-aborted attempts preserve unknown tokens", async () => {
  for (const abort of [false, true]) {
    const app = fixture(async () => { throw new Error("network failure"); });
    const controller = new AbortController();
    if (abort) controller.abort();
    await assert.rejects(app.fetch("https://provider.example", { signal: controller.signal }), /network failure/);
    assert.equal(app.finishes[0].event.status, abort ? "cancelled" : "failed");
    assert.equal(app.finishes[0].event.httpStatus, null);
    assert.equal(app.finishes[0].event.tokensTotal, null);
  }
});

test("each HTTP retry has its own id and failed request record", async () => {
  let calls = 0;
  const app = fixture(async () => ++calls === 1 ? Response.json({ error: "busy" }, { status: 503 }) : Response.json({ usageMetadata: { totalTokenCount: 5 } }));
  await app.fetch("https://provider.example");
  await app.fetch("https://provider.example");
  assert.equal(new Set(app.starts.map(value => value.id)).size, 2);
  assert.deepEqual(app.finishes.map(value => value.event.status), ["failed", "succeeded"]);
  assert.equal(app.finishes[0].event.httpStatus, 503);
});

test("ledger startup failure prevents provider work", async () => {
  let called = false;
  const tracked = usageFetch({ async start() { throw Error("database unavailable"); }, async finish() {} }, event, async () => { called = true; return Response.json({}); });
  await assert.rejects(tracked("https://provider.example"), /database unavailable/);
  assert.equal(called, false);
});

test("finalization failure leaves the pending request without retrying provider work", async () => {
  const log = console.error;
  const logs: unknown[][] = [];
  console.error = (...values) => { logs.push(values); };
  let providerCalls = 0;
  const started: UsageStart[] = [];
  try {
    const tracked = usageFetch({ async start(value) { started.push(value); }, async finish() { throw Error("database unavailable"); } }, event,
      async () => { providerCalls++; return Response.json({ usageMetadata: { totalTokenCount: 3 } }); });
    assert.ok((await tracked("https://provider.example")).ok);
    assert.equal(providerCalls, 1);
    assert.equal(started.length, 1);
    assert.equal(logs[0][1], started[0].id);
  } finally { console.error = log; }
});

test("invalid counts are not stored as billable numbers; reported zero stays zero", () => {
  assert.deepEqual(providerTokens({ usageMetadata: { promptTokenCount: -1, candidatesTokenCount: "4", totalTokenCount: NaN, cachedContentTokenCount: 0 } }), {
    tokensIn: null, tokensOut: null, tokensTotal: null, tokensCached: 0, tokensReasoning: null,
  });
});
