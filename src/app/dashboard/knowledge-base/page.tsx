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

  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load(q?: string) {
    setLoading(true);
    const url = q ? `/api/orgs/knowledge-base?q=${encodeURIComponent(q)}` : "/api/orgs/knowledge-base";
    const res = await fetch(url);
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

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(query || undefined), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

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
      await load(query || undefined);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: Chunk) {
    setEditingId(c.id);
    setEditTitle(c.title);
    setEditContent(c.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
  }

  async function saveEdit(id: number) {
    if (!editTitle.trim() || !editContent.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/knowledge-base/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      cancelEdit();
      await load(query || undefined);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteChunk(id: number) {
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/orgs/knowledge-base/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setChunks((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && chunks.length === 0) return <div className="p-6 text-sm text-slate-400">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto mt-12 px-6 space-y-8">
      <section>
        <h1 className="text-lg font-semibold text-[#123A3E] mb-1">About your business</h1>
        <p className="text-sm text-slate-500 mb-3">
          Used to shape how your chatbot introduces itself and what it stays on-topic about.
        </p>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. We sell handmade leather goods, based in Kathmandu, specializing in..."
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-[#1F2E33] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123A3E]"
        />
        <button
          onClick={saveDescription}
          disabled={saving}
          className="mt-2 px-4 py-2 rounded-lg bg-[#123A3E] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#0D2E31] transition"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {savedMsg && <span className="ml-3 text-xs text-[#5B8266]">{savedMsg}</span>}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#123A3E] mb-1">Knowledge base</h2>
        <p className="text-sm text-slate-500 mb-3">
          Add docs, FAQs, or info your chatbot should know. Each entry becomes something it can search and reference.
        </p>
        <form onSubmit={addChunk} className="space-y-2 mb-4">
          <input
            type="text"
            placeholder="Title (e.g. 'Return policy')"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-[#1F2E33] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123A3E]"
          />
          <textarea
            rows={4}
            placeholder="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-[#1F2E33] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123A3E]"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#B5502A] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#9C4322] transition"
          >
            {saving ? "Adding..." : "Add to knowledge base"}
          </button>
        </form>

        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

        <input
          type="text"
          placeholder="Search entries..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg border border-slate-300 text-sm text-[#1F2E33] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123A3E]"
        />

        <div className="space-y-2">
          {chunks.length === 0 && (
            <p className="text-sm text-slate-400">
              {query ? "No matching entries." : "No entries yet."}
            </p>
          )}
          {chunks.map((c) =>
            editingId === c.id ? (
              <div key={c.id} className="border border-[#123A3E] rounded-lg p-3 bg-white space-y-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-[#1F2E33] bg-white focus:outline-none focus:ring-2 focus:ring-[#123A3E]"
                />
                <textarea
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-[#1F2E33] bg-white focus:outline-none focus:ring-2 focus:ring-[#123A3E]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(c.id)}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg bg-[#123A3E] text-white text-xs font-medium disabled:opacity-50 hover:bg-[#0D2E31] transition"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={c.id} className="border border-slate-200 rounded-lg p-3 bg-[#F7F5F0] flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1F2E33]">{c.title}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.content}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(c)}
                    className="text-xs text-[#123A3E] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteChunk(c.id)}
                    disabled={deletingId === c.id}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    {deletingId === c.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}