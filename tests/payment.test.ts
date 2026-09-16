import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

test("payment callback signature covers all activation fields and rejects tampering", async () => {
  const previous = process.env.ESEWA_SECRET_KEY;
  process.env.ESEWA_SECRET_KEY = "test-only-secret";
  try {
    const { verifyEsewaSignature, generateEsewaSignature } = await import("../src/lib/esewa");
    const signedFields = "transaction_uuid,total_amount,product_code,status";
    const payload = { transaction_uuid: "test-transaction", total_amount: "999", product_code: "EPAYTEST", status: "COMPLETE", signed_field_names: signedFields };
    const sign = (fields: string) => createHmac("sha256", "test-only-secret").update(fields.split(",").map(field => `${field}=${payload[field as keyof typeof payload]}`).join(",")).digest("base64");
    const signature = sign(signedFields);
    assert.equal(verifyEsewaSignature({ ...payload, signature }), true);
    assert.equal(verifyEsewaSignature({ ...payload, total_amount: "1", signature }), false);
    assert.equal(verifyEsewaSignature({ ...payload, signed_field_names: "transaction_uuid", signature: sign("transaction_uuid") }), false);
    assert.equal(verifyEsewaSignature({ ...payload, signature: "invalid" }), false);
    const logs: unknown[][] = [];
    const originalLog = console.log;
    console.log = (...args) => { logs.push(args); };
    try { assert.ok(generateEsewaSignature("999", "test-transaction", "EPAYTEST")); } finally { console.log = originalLog; }
    assert.deepEqual(logs, []);
  } finally {
    if (previous === undefined) delete process.env.ESEWA_SECRET_KEY;
    else process.env.ESEWA_SECRET_KEY = previous;
  }
});
