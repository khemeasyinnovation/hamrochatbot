import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { orgs, knowledgeChunks } from "@/db/schema";
import { eq, and, or, ilike } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";
import { embedText } from "@/lib/gemini";
import { knowledgeEntryError } from "@/lib/knowledgeValidation";

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

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const org = await getMyOrg(userId);
  if (!org) return NextResponse.json({ error: "No business found" }, { status: 404 });

  const { businessDescription, title, content } = await req.json();
  const hasEntry = title !== undefined || content !== undefined;
  if (hasEntry) {
    const error = knowledgeEntryError(title, content);
    if (error) return NextResponse.json({ error }, { status: 400 });
  }
  if (businessDescription !== undefined && (typeof businessDescription !== "string" || businessDescription.length > 2000)) {
    return NextResponse.json({ error: "Business description must be text under 2,000 characters" }, { status: 400 });
  }
  if (!hasEntry && businessDescription === undefined) return NextResponse.json({ error: "Nothing to save" }, { status: 400 });

  if (typeof businessDescription === "string") {
    await db
      .update(orgs)
      .set({ businessDescription: businessDescription.trim() || null })
      .where(eq(orgs.id, org.id));
  }

  if (hasEntry) {
    const embedding = await embedText(`${title}. ${content}`, { orgId: org.id, userId, surface: "knowledge", task: "embedding" }, req.signal);
    await db.insert(knowledgeChunks).values({
      orgId: org.id,
      title: title.trim(),
      category: "manual",
      content: content.trim(),
      embedding,
    });
  }

  return NextResponse.json({ ok: true });
}
