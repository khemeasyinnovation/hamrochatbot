import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { chatSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt));

  return NextResponse.json({ sessions });
}

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [session] = await db.insert(chatSessions).values({ userId }).returning();
  return NextResponse.json({ session });
}