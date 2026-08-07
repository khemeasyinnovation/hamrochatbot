import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/client";
import { widgetSessions, orgs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function verifyOrg(orgSlug: string, embedKey: string | null) {
  const [org] = await db.select().from(orgs).where(eq(orgs.slug, orgSlug));
  if (!org) return { error: "Unknown organization", status: 404 } as const;
  if (!embedKey || embedKey !== org.embedKey) {
    return { error: "Invalid or missing embed key", status: 403 } as const;
  }
  return { org } as const;
}

export async function GET(req: NextRequest) {
  const orgSlug = req.nextUrl.searchParams.get("org");
  const visitorKey = req.nextUrl.searchParams.get("visitor");
  const embedKey = req.nextUrl.searchParams.get("key");
  if (!orgSlug || !visitorKey) {
    return NextResponse.json({ error: "Missing org or visitor" }, { status: 400 });
  }

  const result = await verifyOrg(orgSlug, embedKey);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const sessions = await db
    .select()
    .from(widgetSessions)
    .where(and(eq(widgetSessions.orgId, result.org.id), eq(widgetSessions.visitorKey, visitorKey)))
    .orderBy(desc(widgetSessions.updatedAt));

  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const { orgSlug, visitorKey, embedKey } = await req.json();
  if (!orgSlug || !visitorKey) {
    return NextResponse.json({ error: "Missing org or visitor" }, { status: 400 });
  }

  const result = await verifyOrg(orgSlug, embedKey);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const [session] = await db
    .insert(widgetSessions)
    .values({ orgId: result.org.id, visitorKey })
    .returning();

  return NextResponse.json({ session });
}