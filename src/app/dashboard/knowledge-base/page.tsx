"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

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
  const [needsBusiness, setNeedsBusiness] = useState(false);
  const descriptionLoaded = useRef(false);
  const loadVersion = useRef(0);

  const load = useCallback(async (q?: string) => {
    const version = ++loadVersion.current;
    setLoading(true);
    const url = q ? `/api/orgs/knowledge-base?q=${encodeURIComponent(q)}` : "/api/orgs/knowledge-base";
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (version !== loadVersion.current) return;
      if (res.status === 404) { setNeedsBusiness(true); return; }
      if (!res.ok) throw new Error(data.error || "Failed to load knowledge");
      if (!descriptionLoaded.current) {
        setDescription(data.businessDescription || "");
        descriptionLoaded.current = true;
      }
      setChunks(data.chunks || []);
      setError("");
    } catch (error) {
      if (version === loadVersion.current) setError(error instanceof Error ? error.message : "Couldn't load knowledge. Please retry.");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(query || undefined), 300);
    return () => { clearTimeout(t); loadVersion.current++; };
  }, [query, load]);

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

  if (needsBusiness) return <div className="mx-auto max-w-xl p-6 sm:py-12">
    <h1 className="text-2xl font-semibold text-[#123A3E]">Start with your business</h1>
    <p className="my-4 text-sm leading-6 text-slate-600">Create a business to keep its knowledge together. You can add information and configure your widget before payment.</p>
    <Link href="/dashboard/widget" className="inline-block rounded-lg bg-[#123A3E] px-4 py-3 text-sm text-white">Create your business</Link>
  </div>;
  if (loading && !descriptionLoaded.current) return <div className="p-6 text-sm text-slate-500">Loading your knowledge...</div>;

  return (
    <div className="max-w-4xl mx-auto my-6 sm:my-10 px-4 sm:px-6 pb-24 space-y-6">
      <header><Link href="/dashboard/widget" className="text-sm text-slate-500 hover:underline">Back to widget setup</Link>
        <h1 className="mt-3 text-2xl font-semibold text-[#123A3E]">Your business knowledge</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Add any information you want your assistant to know. Start small, then update it as your business changes.</p>
      </header>
      {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button onClick={() => load(query || undefined)} className="ml-3 underline">Retry loading</button></div>}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-[#123A3E] mb-1">About your business</h2>
        <p className="text-sm text-slate-500 mb-3">
          Used to shape how your chatbot introduces itself and what it stays on-topic about.
        </p>
        <textarea
          rows={4}
          value={description}
          aria-label="Business description"
          maxLength={2000}
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

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-[#123A3E] mb-1">Knowledge base</h2>
        <p className="text-sm text-slate-500 mb-3">
          Paste text, FAQs, product details, policies, or anything else relevant to your business. File uploads are not available yet.
        </p>
        <div className="mb-4 flex flex-wrap gap-2" aria-label="Knowledge starter topics">
          {["Services and pricing", "Hours and contact", "Frequently asked questions", "Policies", "Other information"].map(topic => <button key={topic} type="button" disabled={!!title || !!content} onClick={() => setTitle(topic)} className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">{topic}</button>)}
        </div>
        <form onSubmit={addChunk} className="space-y-2 mb-4">
          <input
            type="text"
            placeholder="Title (e.g. 'Return policy')"
            value={title}
            aria-label="Knowledge title"
            maxLength={200}
            required
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-[#1F2E33] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123A3E]"
          />
          <textarea
            rows={4}
            placeholder="Write the facts your assistant should use. Include details customers ask about, and keep each entry focused on one topic."
            aria-label="Knowledge content"
            maxLength={12000}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-[#1F2E33] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123A3E]"
          />
          <button
            type="submit"
            disabled={saving || !title.trim() || !content.trim()}
            className="px-4 py-2 rounded-lg bg-[#B5502A] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#9C4322] transition"
          >
            {saving ? "Adding..." : "Add to knowledge base"}
          </button>
        </form>

        <input
          type="text"
          placeholder="Search entries..."
          aria-label="Search knowledge entries"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg border border-slate-300 text-sm text-[#1F2E33] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123A3E]"
        />
        <p className="mb-3 text-xs text-slate-500" aria-live="polite">{loading ? "Searching..." : `${chunks.length} ${query ? "matching" : "saved"} entries`}</p>

        <div className="space-y-2">
          {chunks.length === 0 && (
            <p className="text-sm text-slate-400">
              {query ? "No matching entries. Try another search." : "No knowledge saved yet. Add your first entry above so your assistant can answer business questions."}
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
                    onClick={() => { if (window.confirm(`Delete "${c.title}" from your knowledge base?`)) deleteChunk(c.id); }}
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
