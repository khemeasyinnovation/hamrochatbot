"use client";

import { useEffect, useState } from "react";
import { Org, fetchMyOrg, createOrg, updateAllowedDomains } from "@/lib/orgApi";

export default function WidgetPage() {
  const [org, setOrg] = useState<Org | null | undefined>(undefined); // undefined = loading
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [domainsText, setDomainsText] = useState("");
  const [domainsSaved, setDomainsSaved] = useState(false);

  useEffect(() => {
    fetchMyOrg()
      .then(setOrg)
      .catch(() => setOrg(null));
  }, []);

  useEffect(() => {
    if (org?.allowedDomains) setDomainsText(org.allowedDomains.join("\n"));
  }, [org]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const created = await createOrg(name);
      setOrg(created);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function handleCopy(snippet: string) {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveDomains() {
    const domains = domainsText
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);
    try {
      const updated = await updateAllowedDomains(domains);
      setOrg(updated);
      setDomainsSaved(true);
      setTimeout(() => setDomainsSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (org === undefined) {
    return <div className="p-6 text-sm text-slate-400">Loading...</div>;
  }

  if (org === null) {
    return (
      <div className="max-w-md mx-auto mt-16 px-6">
        <h1 className="text-lg font-semibold text-[#0b2545] mb-1">
          Set up your business
        </h1>
        <p className="text-sm text-slate-500 mb-4">
          This becomes your chatbot's identity — its knowledge base and widget
          are scoped to it.
        </p>
        <form onSubmit={handleCreate} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Business name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2 rounded-lg bg-[#0b2545] text-white text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Creating..." : "Create business"}
          </button>
        </form>
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = `<script src="${origin}/widget.js" data-org="${org.slug}" data-key="${org.embedKey}"></script>`;

  return (
    <div className="max-w-2xl mx-auto mt-16 px-6">
      <h1 className="text-lg font-semibold text-[#0b2545] mb-1">
        Your chat widget
      </h1>
      <p className="text-sm text-slate-500 mb-4">
        Paste this snippet before the closing <code>&lt;/body&gt;</code> tag on
        your website.
      </p>
      <div className="relative">
        <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto">
          {snippet}
        </pre>
        <button
          onClick={() => handleCopy(snippet)}
          className="absolute top-2 right-2 px-3 py-1 rounded-md bg-[#0b2545] text-white text-xs"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-4">
        Business: <strong>{org.name}</strong> · Widget ID:{" "}
        <code>{org.slug}</code>
      </p>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-[#0b2545] mb-1">
          Allowed websites
        </h2>
        <p className="text-xs text-slate-500 mb-2">
          One host per line (e.g. <code>localhost</code> or{" "}
          <code>example.com</code>). Leave empty to allow any site — not
          recommended once you're live.
        </p>
        <textarea
          rows={3}
          value={domainsText}
          onChange={(e) => setDomainsText(e.target.value)}
          placeholder="example.com"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
        />
        <button
          onClick={handleSaveDomains}
          className="mt-2 px-4 py-2 rounded-lg bg-[#0b2545] text-white text-sm font-medium"
        >
          Save
        </button>
        {domainsSaved && (
          <span className="ml-3 text-xs text-green-600">Saved.</span>
        )}
      </div>
    </div>
  );
}
