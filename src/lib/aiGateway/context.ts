import type { ModelMessage } from "ai";

export const MAX_MESSAGE_CHARS = 8000;
export const HISTORY_CHARS = 16000;
export const KNOWLEDGE_CHARS = 8000;
export const MAX_VECTOR_DISTANCE = 0.7;

/** Text-only boundary: client-supplied system prompts/tools never enter the prompt. */
export function recentMessages(value: unknown): ModelMessage[] {
  if (!Array.isArray(value) || !value.length || value.length > 200) throw new Error("Invalid message history");
  const messages = value.map(message => {
    if (!message || (message.role !== "user" && message.role !== "assistant")) throw new Error("Invalid message role");
    const text = Array.isArray(message.parts)
      ? message.parts.filter((part: { type?: string; text?: unknown } | null) => part?.type === "text" && typeof part.text === "string")
        .map((part: { text: string }) => part.text).join("\n")
      : typeof message.content === "string" ? message.content : "";
    return { role: message.role as "user" | "assistant", content: text };
  });
  const last = messages[messages.length - 1];
  if (last.role !== "user" || !last.content.trim()) throw new Error("Enter a message to continue");
  if (last.content.length > MAX_MESSAGE_CHARS) throw new Error("Please keep your message under 8,000 characters");
  const selected: typeof messages = [];
  let remaining = HISTORY_CHARS;
  for (const message of messages.slice(-12).reverse()) {
    if (message.content.length > remaining) break;
    selected.unshift(message);
    remaining -= message.content.length;
  }
  // Don't begin a truncated conversation with an orphaned assistant response.
  while (selected[0]?.role === "assistant") selected.shift();
  return selected;
}

export function deterministicReply(question: string): string | null {
  // Explicit transformations only: no guessing at business intent or facts.
  const match = /^(?:make this |convert to )?(lowercase|uppercase):\s*([\s\S]+)$/i.exec(question.trim());
  if (!match) return null;
  return match[1].toLowerCase() === "lowercase" ? match[2].toLowerCase() : match[2].toUpperCase();
}

export function knowledgeContext(entries: string[]): string {
  let remaining = KNOWLEDGE_CHARS;
  const selected: string[] = [];
  for (const entry of entries) {
    if (remaining <= 1) break;
    const text = entry.slice(0, Math.min(2000, remaining - 1));
    selected.push(text);
    remaining -= text.length + 1;
  }
  return selected.join("\n");
}
