import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/client";
import { widgetSessions, widgetMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

async function assertOwnership(sessionId: string, visitorKey: string) {
  const [session] = await db.select().from(widgetSessions).where(eq(widgetSessions.id, sessionId));
  if (!session || session.visitorKey !== visitorKey) return null;
  return session;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visitorKey = req.nextUrl.searchParams.get("visitor");
  if (!visitorKey) return NextResponse.json({ error: "Missing visitor" }, { status: 400 });

  const session = await assertOwnership(id, visitorKey);
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
  const { visitorKey, messages, title } = await req.json();
  if (!visitorKey) return NextResponse.json({ error: "Missing visitor" }, { status: 400 });

  const session = await assertOwnership(id, visitorKey);
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
  if (!visitorKey) return NextResponse.json({ error: "Missing visitor" }, { status: 400 });

  const session = await assertOwnership(id, visitorKey);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(widgetSessions).where(eq(widgetSessions.id, id));
  return NextResponse.json({ ok: true });
}