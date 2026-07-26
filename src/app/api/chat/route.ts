import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { embedText, askGemini } from "@/lib/gemini";
import { sql } from "drizzle-orm";

const SYSTEM_INSTRUCTION = `You are the official real estate assistant for our company, specializing in properties in Kaski district (Pokhara and surrounding areas).

RULES:
1. ONLY answer questions about real estate, land, prices, districts/neighborhoods, or the properties in the provided context.
2. If asked something off-topic (coding, general trivia, unrelated advice, etc.), politely decline: "I can only help with real estate and property questions for our listings."
3. Never invent prices, property details, or availability. If the context below doesn't contain relevant properties, say: "I couldn't find matching properties in our current listings. Would you like me to check other areas or criteria?"
4. Keep answers concise and structured.`;

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  const queryEmbedding = await embedText(message);
  const vectorParam = JSON.stringify(queryEmbedding);

  // Search structured property listings
  const propertyResults = await db.execute(sql`
    select title, address, price, land_area, description
    from properties
    order by embedding <=> ${vectorParam}::vector
    limit 5
  `);

  // Search general knowledge (district guides, FAQs)
  const knowledgeResults = await db.execute(sql`
    select title, content
    from knowledge_chunks
    order by embedding <=> ${vectorParam}::vector
    limit 3
  `);

  const propertyContext = propertyResults.rows
    .map((r: any) => `- ${r.title}: ${r.address}, ${r.land_area} land, price ${r.price}. ${r.description}`)
    .join("\n");

  const knowledgeContext = knowledgeResults.rows
    .map((r: any) => `- ${r.title}: ${r.content}`)
    .join("\n");

  const prompt = `${SYSTEM_INSTRUCTION}

Available properties:
${propertyContext || "No matching properties found."}

General knowledge:
${knowledgeContext || "No relevant knowledge found."}

User question: ${message}`;

  const answer = await askGemini(prompt);

  return NextResponse.json({ answer });
}