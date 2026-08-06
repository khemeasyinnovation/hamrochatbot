import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/client";
import { widgetSessions, orgs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const orgSlug = req.nextUrl.searchParams.get("org");
  const visitorKey = req.nextUrl.searchParams.get("visitor");
  if (!orgSlug || !visitorKey) {
    return NextResponse.json({ error: "Missing org or visitor" }, { status: 400 });
  }

  const [org] = await db.select().from(orgs).where(eq(orgs.slug, orgSlug));
  if (!org) return NextResponse.json({ error: "Unknown organization" }, { status: 404 });

  const sessions = await db
    .select()
    .from(widgetSessions)
    .where(and(eq(widgetSessions.orgId, org.id), eq(widgetSessions.visitorKey, visitorKey)))
    .orderBy(desc(widgetSessions.updatedAt));

  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const { orgSlug, visitorKey } = await req.json();
  if (!orgSlug || !visitorKey) {
    return NextResponse.json({ error: "Missing org or visitor" }, { status: 400 });
  }

  const [org] = await db.select().from(orgs).where(eq(orgs.slug, orgSlug));
  if (!org) return NextResponse.json({ error: "Unknown organization" }, { status: 404 });

  const [session] = await db
    .insert(widgetSessions)
    .values({ orgId: org.id, visitorKey })
    .returning();

  return NextResponse.json({ session });
}