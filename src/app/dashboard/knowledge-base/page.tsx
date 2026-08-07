"use client";

import { useEffect, useState } from "react";

type Chunk = { id: number; title: string; content: string };

export default function KnowledgeBasePage() {
  const [description, setDescription] = useState("");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/orgs/knowledge-base");
    const data = await res.json();
    if (res.ok) {
      setDescription(data.businessDescription || "");
      setChunks(data.chunks || []);
    } else {
      setError(data.error || "Failed to load");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveDescription() {
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      const res = await fetch("/api/orgs/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessDescription: description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSavedMsg("Saved.");
      setTimeout(() => setSavedMsg(""), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addChunk(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/orgs/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      setTitle("");
      setContent("");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto mt-12 px-6 space-y-8">
      <section>
        <h1 className="text-lg font-semibold text-[#0b2545] mb-1">About your business</h1>
        <p className="text-sm text-slate-500 mb-3">
          Used to shape how your chatbot introduces itself and what it stays on-topic about.
        </p>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. We sell handmade leather goods, based in Kathmandu, specializing in..."
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
        />
        <button
          onClick={saveDescription}
          disabled={saving}
          className="mt-2 px-4 py-2 rounded-lg bg-[#0b2545] text-white text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {savedMsg && <span className="ml-3 text-xs text-green-600">{savedMsg}</span>}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#0b2545] mb-1">Knowledge base</h2>
        <p className="text-sm text-slate-500 mb-3">
          Add docs, FAQs, or info your chatbot should know. Each entry becomes something it can search and reference.
        </p>
        <form onSubmit={addChunk} className="space-y-2 mb-4">
          <input
            type="text"
            placeholder="Title (e.g. 'Return policy')"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
          />
          <textarea
            rows={4}
            placeholder="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#0b2545] text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add to knowledge base"}
          </button>
        </form>

        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

        <div className="space-y-2">
          {chunks.length === 0 && (
            <p className="text-sm text-slate-400">No entries yet.</p>
          )}
          {chunks.map((c) => (
            <div key={c.id} className="border border-slate-200 rounded-lg p-3">
              <p className="text-sm font-medium text-slate-800">{c.title}</p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.content}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}