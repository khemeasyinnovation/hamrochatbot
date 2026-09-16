import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db/client";
import { orgs, knowledgeChunks } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const [org] = await db.select().from(orgs).where(eq(orgs.ownerUserId, userId));
  if (!org) return NextResponse.json({ org: null });
  const [knowledge] = await db.select({ count: count() }).from(knowledgeChunks).where(eq(knowledgeChunks.orgId, org.id));
  return NextResponse.json({ org: { ...org, knowledgeCount: knowledge.count } });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { name } = await req.json();
  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: "Business name is required" }, { status: 400 });
  }

  const [existing] = await db.select().from(orgs).where(eq(orgs.ownerUserId, userId));
  if (existing) {
    return NextResponse.json({ error: "You already have a business set up" }, { status: 400 });
  }

  let slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "Please use a name with some letters/numbers" }, { status: 400 });
  }

  // Ensure slug uniqueness by appending a short suffix on collision.
  const [taken] = await db.select().from(orgs).where(eq(orgs.slug, slug));
  if (taken) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const [org] = await db
    .insert(orgs)
    .values({ ownerUserId: userId, name: name.trim(),
         slug ,
        embedKey: crypto.randomBytes(24).toString("hex"),
        })
    .returning();

  return NextResponse.json({ org });
}

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const [org] = await db.select().from(orgs).where(eq(orgs.ownerUserId, userId));
  if (!org) return NextResponse.json({ error: "No business found" }, { status: 404 });

  const { allowedDomains, widgetColor, widgetPosition } = await req.json();

  const updates: Partial<typeof orgs.$inferInsert> = {};

  if (Array.isArray(allowedDomains)) {
    updates.allowedDomains = allowedDomains
      .map((d: string) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, ""))
      .filter(Boolean);
  }

  if (typeof widgetColor === "string") {
    const validHex = /^#[0-9a-fA-F]{6}$/.test(widgetColor);
    if (!validHex) return NextResponse.json({ error: "Color must be a hex code like #123A3E" }, { status: 400 });
    updates.widgetColor = widgetColor;
  }

  if (widgetPosition === "bottom-left" || widgetPosition === "bottom-right") {
    updates.widgetPosition = widgetPosition;
  }

  const [updated] = await db.update(orgs).set(updates).where(eq(orgs.id, org.id)).returning();
  return NextResponse.json({ org: updated });
}
