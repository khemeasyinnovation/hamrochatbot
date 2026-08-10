import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { orgs, knowledgeChunks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";
import { embedText } from "@/lib/gemini";

async function getMyOrg(userId: string) {
  const [org] = await db.select().from(orgs).where(eq(orgs.ownerUserId, userId));
  return org ?? null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const org = await getMyOrg(userId);
  if (!org) return NextResponse.json({ error: "No business found" }, { status: 404 });

  const { id } = await params;
  const chunkId = Number(id);
  if (!Number.isFinite(chunkId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { title, content } = await req.json();
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Title and content required" }, { status: 400 });
  }

  // Re-embed since the content changed — the embedding is derived from title+content
  const embedding = await embedText(`${title}. ${content}`);

  const result = await db
    .update(knowledgeChunks)
    .set({ title: title.trim(), content: content.trim(), embedding })
    .where(and(eq(knowledgeChunks.id, chunkId), eq(knowledgeChunks.orgId, org.id)))
    .returning({ id: knowledgeChunks.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const org = await getMyOrg(userId);
  if (!org) return NextResponse.json({ error: "No business found" }, { status: 404 });

  const { id } = await params;
  const chunkId = Number(id);
  if (!Number.isFinite(chunkId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const result = await db
    .delete(knowledgeChunks)
    .where(and(eq(knowledgeChunks.id, chunkId), eq(knowledgeChunks.orgId, org.id)))
    .returning({ id: knowledgeChunks.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}