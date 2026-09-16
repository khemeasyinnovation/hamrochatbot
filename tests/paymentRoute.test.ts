import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as schema from "../src/db/schema";

const requireModule = createRequire(import.meta.url);
const code = ts.transpileModule(readFileSync(new URL("../src/app/api/payment/success/route.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(amount = "999", providerStatus = "COMPLETE", exists = true) {
  const txn = { orgId: "org-id", transactionUuid: "txn-id", amount: "999", status: "PENDING" };
  const confirmations: unknown[][] = [];
  const writes: unknown[] = [];
  let transactions = 0;
  const db = {
    select: () => ({ from: () => ({ where: async () => exists ? [txn] : [] }) }),
    transaction: async (callback: (tx: unknown) => Promise<void>) => {
      transactions++;
      await callback({ update: (table: unknown) => ({ set: (value: unknown) => ({ where: () => {
        writes.push(value);
        return table === schema.paymentTransactions ? { returning: async () => [txn] } : Promise.resolve();
      } }) }) });
    },
  };
  const imports: Record<string, unknown> = {
    "@/db/client": { db }, "@/db/schema": schema,
    "@/lib/esewa": { ESEWA_PRODUCT_CODE: "EPAYTEST", verifyEsewaSignature: () => true,
      checkEsewaStatus: async (...args: unknown[]) => { confirmations.push(args); return { status: providerStatus, ref_id: "ref-id" }; } },
  };
  const routeModule = { exports: {} as { GET: (request: Request) => Promise<Response> } };
  runInNewContext(code, { exports: routeModule.exports, module: routeModule, console, Buffer, URL, Date, process: { env: {} }, require: (name: string) => name in imports ? imports[name] : requireModule(name) });
  const data = Buffer.from(JSON.stringify({ transaction_uuid: "txn-id", total_amount: amount, product_code: "EPAYTEST", status: "COMPLETE" })).toString("base64");
  return { confirmations, writes, transactions: () => transactions, run: () => routeModule.exports.GET(new Request(`http://localhost/api/payment/success?data=${encodeURIComponent(data)}`)) };
}

test("payment confirmation checks the recorded amount and rejects unknown transactions", async () => {
  for (const app of [setup("1"), setup("999", "COMPLETE", false)]) {
    assert.match((await app.run()).headers.get("location")!, /status=failure/);
    assert.equal(app.confirmations.length, 0);
    assert.equal(app.transactions(), 0);
  }
});

test("unconfirmed provider status cannot activate the widget", async () => {
  const app = setup("999", "PENDING");
  assert.match((await app.run()).headers.get("location")!, /status=failure/);
  assert.equal(app.transactions(), 0);
});

test("verified payment and widget activation are written in one transaction", async () => {
  const app = setup();
  assert.match((await app.run()).headers.get("location")!, /status=success/);
  assert.deepEqual(app.confirmations, [["EPAYTEST", "999", "txn-id"]]);
  assert.equal(app.transactions(), 1);
  assert.equal(app.writes.length, 2);
  assert.equal((app.writes[0] as { status: string }).status, "COMPLETE");
  assert.equal((app.writes[1] as { isPaid: boolean }).isPaid, true);
});
