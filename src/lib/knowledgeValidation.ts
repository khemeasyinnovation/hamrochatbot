export function knowledgeEntryError(title: unknown, content: unknown): string | null {
  if (typeof title !== "string" || typeof content !== "string" || !title.trim() || !content.trim()) return "Title and content are required";
  if (title.trim().length > 200) return "Keep the title under 200 characters";
  if (content.trim().length > 12000) return "Keep each entry under 12,000 characters. Split longer information into separate topics.";
  return null;
}
