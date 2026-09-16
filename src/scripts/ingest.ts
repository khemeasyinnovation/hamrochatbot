import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { knowledgeChunks, orgs } from "../db/schema";
import { embedText } from "../lib/gemini";

const ORG_SLUG = "easy-real-estate";

// Splits text by markdown headings (# ...) into chunks.
// Each heading + its following paragraph becomes one chunk.
function chunkMarkdown(text: string): { title: string; content: string }[] {
  const sections = text.split(/\n(?=# )/).filter(Boolean);
  return sections.map((section) => {
    const lines = section.trim().split("\n");
    const title = lines[0].replace(/^#\s*/, "").trim();
    const content = lines.slice(1).join(" ").trim();
    return { title, content };
  });
}

async function ingestFile(filePath: string, category: string, orgId: string) {
  const text = fs.readFileSync(filePath, "utf-8");
  const chunks = chunkMarkdown(text);

  for (const chunk of chunks) {
    const embedding = await embedText(`${chunk.title}. ${chunk.content}`, { orgId, surface: "ingestion", task: "embedding" });
    await db.insert(knowledgeChunks).values({
      orgId,
      title: chunk.title,
      category,
      content: chunk.content,
      embedding,
    });
    console.log(`Ingested chunk: ${chunk.title}`);
  }
}

async function main() {
  const [org] = await db.select().from(orgs).where(eq(orgs.slug, ORG_SLUG));
  if (!org) {
    throw new Error(
      `Org with slug "${ORG_SLUG}" not found — insert it first (see Step 2 of the org_id migration).`,
    );
  }

  const kbDir = path.join(__dirname, "../knowledge-base");
  const files = fs.readdirSync(kbDir);

  for (const file of files) {
    if (file.endsWith(".md")) {
      await ingestFile(path.join(kbDir, file), "district_guide", org.id);
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
