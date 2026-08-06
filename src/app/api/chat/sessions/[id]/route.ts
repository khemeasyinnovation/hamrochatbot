import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { chatSessions, chatMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";

async function assertOwnership(sessionId: string, userId: string) {
  const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId));
  if (!session || session.userId !== userId) return null;
  return session;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await assertOwnership(id, userId);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, id))
    .orderBy(asc(chatMessages.createdAt));

  return NextResponse.json({ session, messages });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await assertOwnership(id, userId);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { messages, title } = await req.json();

  // Replace-all strategy: simple and fine for chat-length lists.
  // Flagged as a later perf concern if history gets very long, same as
  // the unbounded-history note already in the project doc.
  await db.delete(chatMessages).where(eq(chatMessages.sessionId, id));
  if (messages?.length) {
    await db.insert(chatMessages).values(
      messages.map((m: any) => ({ sessionId: id, role: m.role, parts: m.parts }))
    );
  }

  await db
    .update(chatSessions)
    .set({ title: title ?? session.title, updatedAt: new Date() })
    .where(eq(chatSessions.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await assertOwnership(id, userId);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(chatSessions).where(eq(chatSessions.id, id)); // cascades to messages
  return NextResponse.json({ ok: true });
}