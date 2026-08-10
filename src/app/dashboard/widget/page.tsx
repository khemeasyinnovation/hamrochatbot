"use client";

import { useEffect, useState } from "react";
import { Org, fetchMyOrg, createOrg, updateAllowedDomains, updateWidgetAppearance } from "@/lib/orgApi";

export default function WidgetPage() {
  const [org, setOrg] = useState<Org | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [domainsText, setDomainsText] = useState("");
  const [domainsSaved, setDomainsSaved] = useState(false);
  const [color, setColor] = useState("#123A3E");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left">("bottom-right");
  const [appearanceSaved, setAppearanceSaved] = useState(false);

  useEffect(() => {
    fetchMyOrg()
      .then(setOrg)
      .catch(() => setOrg(null));
  }, []);

  useEffect(() => {
    if (org?.allowedDomains) setDomainsText(org.allowedDomains.join("\n"));
    if (org?.widgetColor) setColor(org.widgetColor);
    if (org?.widgetPosition === "bottom-left" || org?.widgetPosition === "bottom-right") {
      setPosition(org.widgetPosition);
    }
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

  async function handleSaveAppearance() {
    try {
      const updated = await updateWidgetAppearance(color, position);
      setOrg(updated);
      setAppearanceSaved(true);
      setTimeout(() => setAppearanceSaved(false), 2000);
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
        <h1 className="text-lg font-semibold text-[#123A3E] mb-1">
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
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-[#1F2E33] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123A3E]"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2 rounded-lg bg-[#123A3E] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#0D2E31] transition"
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
      <h1 className="text-lg font-semibold text-[#123A3E] mb-1">
        Your chat widget
      </h1>
      <p className="text-sm text-slate-500 mb-4">
        Paste this snippet before the closing <code>&lt;/body&gt;</code> tag on
        your website.
      </p>
      <div className="relative">
        <pre className="bg-[#1F2E33] text-slate-100 text-xs rounded-lg p-4 overflow-x-auto">
          {snippet}
        </pre>
        <button
          onClick={() => handleCopy(snippet)}
          className="absolute top-2 right-2 px-3 py-1 rounded-md bg-[#B5502A] text-white text-xs hover:bg-[#9C4322] transition"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-4">
        Business: <strong>{org.name}</strong> · Widget ID:{" "}
        <code>{org.slug}</code>
      </p>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-[#123A3E] mb-1">
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
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-[#1F2E33] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123A3E]"
        />
        <button
          onClick={handleSaveDomains}
          className="mt-2 px-4 py-2 rounded-lg bg-[#123A3E] text-white text-sm font-medium hover:bg-[#0D2E31] transition"
        >
          Save
        </button>
        {domainsSaved && (
          <span className="ml-3 text-xs text-[#5B8266]">Saved.</span>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-[#123A3E] mb-1">
          Appearance
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Choose a launcher color and which bottom corner it sits in.
        </p>
        <div className="flex items-center gap-6 mb-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Color
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-9 h-9 rounded-md border border-slate-300 cursor-pointer"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Position
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as "bottom-right" | "bottom-left")}
              className="px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-[#1F2E33]"
            >
              <option value="bottom-right">Bottom right</option>
              <option value="bottom-left">Bottom left</option>
            </select>
          </label>
        </div>
        <button
          onClick={handleSaveAppearance}
          className="px-4 py-2 rounded-lg bg-[#123A3E] text-white text-sm font-medium hover:bg-[#0D2E31] transition"
        >
          Save
        </button>
        {appearanceSaved && (
          <span className="ml-3 text-xs text-[#5B8266]">Saved.</span>
        )}
      </div>
    </div>
  );
}