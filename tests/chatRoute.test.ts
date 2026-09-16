import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { PgDialect } from "drizzle-orm/pg-core";
import * as schema from "../src/db/schema";
import * as context from "../src/lib/aiGateway/context";
import * as access from "../src/lib/widgetAccess";

const requireModule = createRequire(import.meta.url);
const routeCode = ts.transpileModule(readFileSync(new URL("../src/app/api/chat/route.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const sessionId = "22222222-2222-4222-8222-222222222222";
const org = { id: "11111111-1111-4111-8111-111111111111", slug: "easy-real-estate", embedKey: "key", isPaid: true };

function harness(userId: string | null, responses: unknown[][]) {
  const queries: { sql: string; params: unknown[] }[] = [];
  const dialect = new PgDialect();
  const db = { select: () => ({ from: () => ({ where: (query: Parameters<PgDialect['sqlToQuery']>[0]) => {
    queries.push(dialect.sqlToQuery(query));
    if (!responses.length) throw Error("Unexpected database query");
    return responses.shift();
  } }) }) };
  let providerCalls = 0;
  const provider = () => { providerCalls++; throw Error("Unexpected provider call"); };
  const imports: Record<string, unknown> = {
    "@/db/client": { db }, "@/db/schema": schema,
    "@/lib/auth": { getCurrentUserId: async () => userId },
    "@/lib/widgetAccess": access, "@/lib/aiGateway/context": context,
    "@/lib/aiGateway": { embedText: provider, resolveProvider: provider, generateResponse: provider },
  };
  const routeModule = { exports: {} as { POST: (request: Request) => Promise<Response> } };
  runInNewContext(routeCode, { exports: routeModule.exports, module: routeModule, console, require: (name: string) => name in imports ? imports[name] : requireModule(name) });
  return {
    queries, calls: () => providerCalls,
    send: (extra: Record<string, unknown> = {}) => routeModule.exports.POST(new Request("http://localhost/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, messages: [{ role: "user", parts: [{ type: "text", text: "lowercase: HELLO" }] }], ...extra }),
    })),
  };
}

test("chat API refuses unauthenticated owner requests before storage or AI", async () => {
  const app = harness(null, []);
  assert.equal((await app.send()).status, 401);
  assert.equal(app.queries.length, 0);
  assert.equal(app.calls(), 0);
});

test("default organization cannot bypass widget key or payment checks", async () => {
  for (const [key, paid, status] of [["wrong", true, 403], ["key", false, 402]] as const) {
    const app = harness(null, [[{ ...org, isPaid: paid }]]);
    assert.equal((await app.send({ orgSlug: org.slug, embedKey: key, visitorKey: "visitor" })).status, status);
    assert.equal(app.queries.length, 1);
    assert.equal(app.calls(), 0);
  }
});

test("widget session lookup scopes organization, session and visitor before AI", async () => {
  const app = harness(null, [[org], []]);
  assert.equal((await app.send({ orgSlug: org.slug, embedKey: "key", visitorKey: "other-visitor" })).status, 404);
  assert.deepEqual(app.queries[1].params, [sessionId, org.id, "other-visitor"]);
  assert.equal(app.calls(), 0);
});

test("owner session lookup scopes user and deterministic replies work before business setup", async () => {
  const app = harness("owner-id", [[{ id: sessionId }], []]);
  const response = await app.send();
  assert.equal(response.status, 200);
  assert.match(await response.text(), /hello/);
  assert.deepEqual(app.queries[0].params, [sessionId, "owner-id"]);
  assert.deepEqual(app.queries[1].params, ["owner-id"]);
  assert.equal(app.calls(), 0);
});
