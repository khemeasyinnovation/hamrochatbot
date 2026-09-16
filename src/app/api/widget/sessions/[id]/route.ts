import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/client";
import { widgetSessions, widgetMessages, orgs } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { widgetAccessError } from "@/lib/widgetAccess";

async function verifyOrg(orgSlug: string, embedKey: string | null) {
  const [org] = await db.select().from(orgs).where(eq(orgs.slug, orgSlug));
  const error = widgetAccessError(org, embedKey);
  if (error) return error;
  return { org } as const;
}

async function assertOwnership(sessionId: string, visitorKey: string, orgId: string) {
  const [session] = await db.select().from(widgetSessions).where(eq(widgetSessions.id, sessionId));
  if (!session || session.visitorKey !== visitorKey || session.orgId !== orgId) return null;
  return session;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visitorKey = req.nextUrl.searchParams.get("visitor");
  const orgSlug = req.nextUrl.searchParams.get("org");
  const embedKey = req.nextUrl.searchParams.get("key");
  if (!visitorKey || !orgSlug) return NextResponse.json({ error: "Missing visitor or org" }, { status: 400 });

  const result = await verifyOrg(orgSlug, embedKey);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const session = await assertOwnership(id, visitorKey, result.org.id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await db
    .select()
    .from(widgetMessages)
    .where(eq(widgetMessages.sessionId, id))
    .orderBy(asc(widgetMessages.createdAt));

  return NextResponse.json({ session, messages });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { visitorKey, orgSlug, embedKey, messages, title } = await req.json();
  if (!visitorKey || !orgSlug) return NextResponse.json({ error: "Missing visitor or org" }, { status: 400 });

  const result = await verifyOrg(orgSlug, embedKey);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const session = await assertOwnership(id, visitorKey, result.org.id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(widgetMessages).where(eq(widgetMessages.sessionId, id));
  if (messages?.length) {
    await db.insert(widgetMessages).values(
      messages.map((m: any) => ({ sessionId: id, role: m.role, parts: m.parts })),
    );
  }

  await db
    .update(widgetSessions)
    .set({ title: title ?? session.title, updatedAt: new Date() })
    .where(eq(widgetSessions.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visitorKey = req.nextUrl.searchParams.get("visitor");
  const orgSlug = req.nextUrl.searchParams.get("org");
  const embedKey = req.nextUrl.searchParams.get("key");
  if (!visitorKey || !orgSlug) return NextResponse.json({ error: "Missing visitor or org" }, { status: 400 });

  const result = await verifyOrg(orgSlug, embedKey);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const session = await assertOwnership(id, visitorKey, result.org.id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(widgetSessions).where(eq(widgetSessions.id, id));
  return NextResponse.json({ ok: true });
}
