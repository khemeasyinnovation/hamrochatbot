import { NextRequest, NextResponse } from "next/server";
import { streamText, convertToModelMessages, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/db/client";
import { embedText } from "@/lib/gemini";
import { orgs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const MODEL_CANDIDATES = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];
const DEFAULT_ORG_SLUG = "easy-real-estate";

let cachedModel: string | null = null;
let cachedAt = 0;
const CACHE_MS = 30 * 60 * 1000;

async function resolveModel(): Promise<string> {
  if (cachedModel && Date.now() - cachedAt < CACHE_MS) return cachedModel;
  for (const modelId of MODEL_CANDIDATES) {
    try {
      await generateText({ model: google(modelId), prompt: "ping", maxOutputTokens: 1 });
      console.log(`[chat route] Using model: ${modelId}`);
      cachedModel = modelId;
      cachedAt = Date.now();
      return modelId;
    } catch {
      console.error(`[chat route] ${modelId} unavailable, trying next candidate`);
    }
  }
  throw new Error("All candidate Gemini models are currently unavailable.");
}

function buildSystemInstruction(orgName: string, businessDescription: string | null): string {
  const description =
    businessDescription?.trim() ||
    `a business named "${orgName}". No detailed business description has been provided yet.`;

  return `You are the official AI assistant for ${orgName}.

About this business: ${description}

RULES:
1. ONLY answer questions relevant to this business, based on the information and context provided below.
2. If asked something off-topic or unrelated to this business, politely decline: "I can only help with questions about ${orgName}."
3. Never invent facts, prices, or details. If the provided context doesn't contain relevant info, say so honestly.
4. Keep answers concise and structured.
5. NEVER output raw JSON, code blocks, or data structures. Always write in natural conversational sentences or simple markdown lists/tables meant for a chat widget — never technical formats.
6. Keep tables narrow: at most 3 short columns, since they render in a small chat panel.`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, orgSlug, embedKey } = await req.json();
    const slug = orgSlug || DEFAULT_ORG_SLUG;

    const [org] = await db.select().from(orgs).where(eq(orgs.slug, slug));
    if (!org) {
      return NextResponse.json({ error: "Unknown organization." }, { status: 404 });
    }

    // Widget traffic (any org other than the dashboard's own default) must
    // present the matching secret embed key. Mode 1 never sends orgSlug,
    // so it always uses the default and skips this check.
    if (orgSlug && orgSlug !== DEFAULT_ORG_SLUG) {
      if (!embedKey || embedKey !== org.embedKey) {
        return NextResponse.json({ error: "Invalid or missing embed key" }, { status: 403 });
      }
    }

    const lastMessage = messages[messages.length - 1];
    const userQuestion =
      lastMessage?.parts
        ?.filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join(" ")
        .trim() ||
      lastMessage?.content ||
      "";

    if (!userQuestion) {
      console.error("[chat route] Empty user question extracted from:", JSON.stringify(lastMessage));
    }

    const [queryEmbedding, modelId] = await Promise.all([embedText(userQuestion), resolveModel()]);
    const vectorParam = JSON.stringify(queryEmbedding);

    const [propertyResults, knowledgeResults] = await Promise.all([
      db.execute(sql`
        select title, address, price, land_area, description
        from properties
        where org_id = ${org.id}
        order by embedding <=> ${vectorParam}::vector
        limit 5
      `),
      db.execute(sql`
        select title, content
        from knowledge_chunks
        where org_id = ${org.id}
        order by embedding <=> ${vectorParam}::vector
        limit 3
      `),
    ]);

    const propertyContext = propertyResults.rows
      .map((r: any) => `- ${r.title}: ${r.address}, ${r.land_area} land, price ${r.price}. ${r.description}`)
      .join("\n");

    const knowledgeContext = knowledgeResults.rows
      .map((r: any) => `- ${r.title}: ${r.content}`)
      .join("\n");

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: google(modelId),
      system: `${buildSystemInstruction(org.name, org.businessDescription)}

Available properties:
${propertyContext || "No matching properties found."}

General knowledge:
${knowledgeContext || "No relevant knowledge found."}`,
      messages: modelMessages,
      onError: ({ error }) => {
        console.error("[chat route] Stream error, invalidating model cache:", error);
        cachedModel = null;
      },
      onFinish: ({ finishReason, text }) => {
        if (!text || finishReason === "content-filter") {
          console.error("[chat route] Empty or filtered completion. finishReason:", finishReason);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[chat route] Fatal error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong processing your request." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}