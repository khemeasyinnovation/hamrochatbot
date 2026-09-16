import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { PgDialect } from "drizzle-orm/pg-core";
import * as schema from "../src/db/schema";

const requireModule = createRequire(import.meta.url);
const code = ts.transpileModule(readFileSync(new URL("../src/app/api/orgs/usage/route.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(userId: string | null, hasOrg = true) {
  const queries: { sql: string; params: unknown[] }[] = [];
  const dialect = new PgDialect();
  let selects = 0;
  const db = { select: () => {
    const selection = ++selects;
    return { from: () => ({ where: (query: Parameters<PgDialect["sqlToQuery"]>[0]) => {
      queries.push(dialect.sqlToQuery(query));
      return selection === 1 ? Promise.resolve(hasOrg ? [{ id: "owned-org" }] : []) : { groupBy: async () => [{ surface: "widget", status: "succeeded", requests: 1, knownTotalTokens: "0", unknownTokenRequests: 1 }] };
    } }) };
  } };
  const imports: Record<string, unknown> = { "@/db/client": { db }, "@/db/schema": schema, "@/lib/auth": { getCurrentUserId: async () => userId } };
  const routeModule = { exports: {} as { GET: (request?: Request) => Promise<Response> } };
  runInNewContext(code, { exports: routeModule.exports, module: routeModule, Date, require: (name: string) => name in imports ? imports[name] : requireModule(name) });
  return { queries, run: () => routeModule.exports.GET(new Request("http://localhost/api/orgs/usage?orgId=attacker-org&userId=attacker")) };
}

test("usage summary requires authentication before any database read", async () => {
  const app = setup(null);
  assert.equal((await app.run()).status, 401);
  assert.equal(app.queries.length, 0);
});

test("usage summary uses server-owned scope, includes unknown usage and disables caching", async () => {
  const app = setup("owner-id");
  const response = await app.run();
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(app.queries[0].params, ["owner-id"]);
  assert.deepEqual(app.queries[1].params.slice(0, 2), ["owned-org", "owner-id"]);
  assert.ok(!app.queries[1].params.includes("attacker-org"));
  const result = await response.json();
  assert.equal(result.groups[0].unknownTokenRequests, 1);
  assert.equal(result.allowanceEnforced, false);
});

test("owners without a business can only read their personal pre-business usage", async () => {
  const app = setup("owner-id", false);
  assert.equal((await app.run()).status, 200);
  assert.equal(app.queries[1].params[0], "owner-id");
  assert.match(app.queries[1].sql, /"org_id" is null/);
});
