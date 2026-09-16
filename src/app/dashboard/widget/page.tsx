"use client";

import { useEffect, useState } from "react";
import { RobotMark } from "@/components/chat/RobotMark";
import { WidgetSetupOverview } from "@/components/chat/WidgetSetupOverview";
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
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [appearanceSaved, setAppearanceSaved] = useState(false);

  useEffect(() => {
    fetchMyOrg()
      .then(setOrg)
      .catch((error) => setError(error.message || "Couldn't load your business. Please reload."));
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

  async function handleCopy(snippet: string) {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically. Select and copy the installation code below.");
    }
  }

  async function handleSaveDomains() {
    const domains = domainsText
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);
    try {
      const updated = await updateAllowedDomains(domains);
      setOrg((current) => ({ ...updated, knowledgeCount: current?.knowledgeCount }));
      setDomainsSaved(true);
      setTimeout(() => setDomainsSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSaveAppearance() {
    setSavingAppearance(true);
    setError("");
    setAppearanceSaved(false);
    try {
      const updated = await updateWidgetAppearance(color, position);
      setOrg((current) => ({ ...updated, knowledgeCount: current?.knowledgeCount }));
      setAppearanceSaved(true);
      setTimeout(() => setAppearanceSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingAppearance(false);
    }
  }

  if (org === undefined) {
    return <div className="p-6 text-sm text-slate-500">{error || "Loading your widget..."}{error && <button onClick={() => window.location.reload()} className="ml-3 underline">Retry</button>}</div>;
  }

  if (org === null) {
    return (
      <div className="max-w-md mx-auto my-6 sm:my-12 px-4 sm:px-6 pb-8">
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
    <div className="max-w-4xl mx-auto my-6 sm:my-10 px-4 sm:px-6 pb-24">
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <WidgetSetupOverview org={org} />
      <section id="install" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-[#123A3E] mb-1">Install on your website</h2>
      {!org.isPaid && <p className="my-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">You can add the code now. Visitors can chat after payment is confirmed.</p>}
      <p className="text-sm text-slate-500 mb-4">
        Paste this snippet before the closing <code>&lt;/body&gt;</code> tag on
        your website.
      </p>
      <div className="relative">
        <pre className="bg-[#1F2E33] text-slate-100 text-xs rounded-lg p-4 pt-12 overflow-x-auto">
          {snippet}
        </pre>
        <button
          onClick={() => handleCopy(snippet)}
          className="absolute top-2 right-2 px-3 py-1 rounded-md bg-[#B5502A] text-white text-xs hover:bg-[#9C4322] transition"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-4 break-words">
        Business: <strong>{org.name}</strong> · Widget ID:{" "}
        <code>{org.slug}</code>
      </p>
      <p className="mt-3 text-xs text-slate-500">Installation is not automatically detected. Open your website to check the launcher after setup.</p>
      </section>

      <div id="domains" className="mt-8 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
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

      <div id="design" className="mt-8 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-[#123A3E] mb-1">
          Appearance
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Choose your color and corner. Open websites check for saved changes every 30 seconds.
        </p>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Color
            <input
              type="color"
              value={color}
              onChange={(e) => { setColor(e.target.value); setAppearanceSaved(false); }}
              className="w-9 h-9 rounded-md border border-slate-300 cursor-pointer"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Position
            <select
              value={position}
              onChange={(e) => { setPosition(e.target.value as "bottom-right" | "bottom-left"); setAppearanceSaved(false); }}
              className="px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-[#1F2E33]"
            >
              <option value="bottom-right">Bottom right</option>
              <option value="bottom-left">Bottom left</option>
            </select>
          </label>
        </div>
        <div className="relative h-44 rounded-xl border border-slate-200 bg-[#EEF2F0] mb-4 overflow-hidden" aria-label="Widget appearance preview">
          <p className="p-4 text-xs text-slate-500">Your website / Preview</p>
          <div className="mx-4 h-2 w-1/2 rounded bg-slate-200" />
          <div className="mx-4 mt-2 h-2 w-1/3 rounded bg-slate-200" />
          <div className={`absolute bottom-4 ${position === "bottom-left" ? "left-4" : "right-4"} flex h-14 w-14 items-center justify-center rounded-full shadow-lg`} style={{ background: color, color: parseInt(color.slice(1,3),16) * .299 + parseInt(color.slice(3,5),16) * .587 + parseInt(color.slice(5,7),16) * .114 > 160 ? "#123A3E" : "white" }}>
            <RobotMark />
          </div>
        </div>
        <button
          disabled={savingAppearance}
          onClick={handleSaveAppearance}
          className="px-4 py-2 rounded-lg bg-[#123A3E] text-white text-sm font-medium hover:bg-[#0D2E31] transition"
        >
          {savingAppearance ? "Saving..." : "Save appearance"}
        </button>
        {appearanceSaved && (
          <span className="ml-3 text-xs text-[#5B8266]">Saved.</span>
        )}
      </div>
    </div>
  );
}
