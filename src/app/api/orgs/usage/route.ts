import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/db/client";
import { aiUsage, orgs } from "@/db/schema";
import { and, eq, gte, isNull, or, sql } from "drizzle-orm";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const [org] = await db.select({ id: orgs.id }).from(orgs).where(eq(orgs.ownerUserId, userId));
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  // Never accept orgId/userId from the caller. Include pre-business owner Chat separately.
  const personal = and(isNull(aiUsage.orgId), eq(aiUsage.userId, userId));
  const scope = org ? or(eq(aiUsage.orgId, org.id), personal) : personal;
  const groups = await db.select({
    surface: aiUsage.surface, operation: aiUsage.operation, status: aiUsage.status,
    requests: sql<number>`count(*)::int`,
    knownTotalTokens: sql<string>`coalesce(sum(${aiUsage.tokensTotal}), 0)::text`,
    unknownTokenRequests: sql<number>`count(*) filter (where ${aiUsage.tokensTotal} is null)::int`,
  }).from(aiUsage).where(and(scope, gte(aiUsage.createdAt, since)))
    .groupBy(aiUsage.surface, aiUsage.operation, aiUsage.status);
  return NextResponse.json({ since: since.toISOString(), groups, allowanceEnforced: false }, { headers: { "Cache-Control": "no-store" } });
}
