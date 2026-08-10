import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/client";
import { orgs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const orgSlug = req.nextUrl.searchParams.get("org");
  const embedKey = req.nextUrl.searchParams.get("key");
  if (!orgSlug || !embedKey) {
    return NextResponse.json({ error: "Missing org or key" }, { status: 400 });
  }

  const [org] = await db.select().from(orgs).where(eq(orgs.slug, orgSlug));
  if (!org) return NextResponse.json({ error: "Unknown organization" }, { status: 404 });
  if (embedKey !== org.embedKey) {
    return NextResponse.json({ error: "Invalid embed key" }, { status: 403 });
  }

  return NextResponse.json({
    widgetColor: org.widgetColor || "#123A3E",
    widgetPosition: org.widgetPosition || "bottom-right",
  });
}