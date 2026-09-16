// One explicit, real embedding request; no Knowledge/payment/business records are changed.
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { aiUsage, orgs } from "../db/schema";
import { createAIGateway } from "../lib/aiGateway";
import { databaseUsageStore } from "../lib/aiGateway/usageStore";

async function main() {
  const [org] = await db.select({ id: orgs.id, ownerUserId: orgs.ownerUserId }).from(orgs).where(eq(orgs.slug, "hamrochatbot-support"));
  if (!org) throw Error("Support organization is missing");
  const security = await db.execute(sql`select relrowsecurity from pg_class where oid = 'public.ai_usage'::regclass`);
  assert.equal(security.rows[0]?.relrowsecurity, true);
  if (!process.argv.includes("--provider-call")) {
    console.log("Usage table exists and row-level security is enabled. Pass --provider-call for one real embedding check.");
    return;
  }
  const requestIds: string[] = [];
  const gateway = createAIGateway({
    async start(event) { requestIds.push(event.id); await databaseUsageStore.start(event); },
    finish: databaseUsageStore.finish,
  });
  const vector = await gateway.embedText("HamRobot usage recording check.", {
    orgId: org.id, userId: org.ownerUserId, surface: "ingestion", task: "embedding",
  }, AbortSignal.timeout(20000));
  assert.equal(vector.length, 3072);
  assert.equal(requestIds.length, 1);
  const [record] = await db.select().from(aiUsage).where(eq(aiUsage.id, requestIds[0]));
  assert.equal(record.status, "succeeded");
  assert.equal(record.orgId, org.id);
  assert.equal(record.operation, "embedding");
  console.log(JSON.stringify({ check: "real embedding and usage persistence", status: record.status, vectorDimensions: vector.length, requestCount: record.requestCount, reportedTokens: record.tokensTotal, unknownTokenUsage: record.tokensTotal === null }));
}

main().then(() => process.exit(0)).catch(() => {
  console.error("Live usage check failed. Inspect ai_usage status and provider configuration; no secret or provider response is printed.");
  process.exit(1);
});
