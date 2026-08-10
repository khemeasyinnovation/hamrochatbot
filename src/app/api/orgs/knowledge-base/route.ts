import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { orgs, knowledgeChunks } from "@/db/schema";
import { eq, and, or, ilike } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";
import { embedText } from "@/lib/gemini";

async function getMyOrg(userId: string) {
  const [org] = await db.select().from(orgs).where(eq(orgs.ownerUserId, userId));
  return org ?? null;
}

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const org = await getMyOrg(userId);
  if (!org) return NextResponse.json({ error: "No business found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const whereClause = q
    ? and(
        eq(knowledgeChunks.orgId, org.id),
        or(ilike(knowledgeChunks.title, `%${q}%`), ilike(knowledgeChunks.content, `%${q}%`))
      )
    : eq(knowledgeChunks.orgId, org.id);

  const chunks = await db
    .select({ id: knowledgeChunks.id, title: knowledgeChunks.title, content: knowledgeChunks.content })
    .from(knowledgeChunks)
    .where(whereClause);

  return NextResponse.json({
    businessDescription: org.businessDescription,
    chunks,
  });
}

// POST stays exactly as it is — unchanged
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const org = await getMyOrg(userId);
  if (!org) return NextResponse.json({ error: "No business found" }, { status: 404 });

  const { businessDescription, title, content } = await req.json();

  if (typeof businessDescription === "string") {
    await db
      .update(orgs)
      .set({ businessDescription: businessDescription.trim() || null })
      .where(eq(orgs.id, org.id));
  }

  if (title && content) {
    const embedding = await embedText(`${title}. ${content}`);
    await db.insert(knowledgeChunks).values({
      orgId: org.id,
      title,
      category: "manual",
      content,
      embedding,
    });
  }

  return NextResponse.json({ ok: true });
}