import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db/client";
import { orgs } from "@/db/schema";
import { eq } from "drizzle-orm";

// This endpoint serves public embed appearance, never account data or cookies.
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(req: NextRequest) {
  const orgSlug = req.nextUrl.searchParams.get("org");
  const embedKey = req.nextUrl.searchParams.get("key");
  if (!orgSlug || !embedKey) {
    return NextResponse.json({ error: "Missing org or key" }, { status: 400, headers });
  }

  const [org] = await db.select().from(orgs).where(eq(orgs.slug, orgSlug));
  if (!org) return NextResponse.json({ error: "Unknown organization" }, { status: 404, headers });
  if (embedKey !== org.embedKey) {
    return NextResponse.json({ error: "Invalid embed key" }, { status: 403, headers });
  }

  return NextResponse.json({
    widgetColor: org.widgetColor || "#123A3E",
    widgetPosition: org.widgetPosition || "bottom-right",
  }, { headers });
}
