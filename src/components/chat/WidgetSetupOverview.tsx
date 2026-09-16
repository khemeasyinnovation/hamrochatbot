import Link from "next/link";
import type { Org } from "@/lib/orgApi";
import { ArrowUpRight, BookOpen, CreditCard, Globe, Palette } from "lucide-react";

export function WidgetSetupOverview({ org }: { org: Org }) {
  const hasKnowledge = (org.knowledgeCount ?? 0) > 0;
  const hasDomains = !!org.allowedDomains?.length;
  const steps = [
    { title: "Add your knowledge", detail: hasKnowledge ? `${org.knowledgeCount} saved entries` : "Add answers, services, prices, or any business information.", href: "/dashboard/knowledge-base", done: hasKnowledge, icon: BookOpen },
    { title: "Activate your widget", detail: org.isPaid ? "Payment confirmed. Public chat is enabled." : "Configure first. Complete payment before visitors can chat.", href: "/dashboard/payment", done: org.isPaid, icon: CreditCard },
    { title: "Choose your appearance", detail: "Preview your color and choose the launcher corner.", href: "#design", done: !!org.widgetColor, icon: Palette },
    { title: "Set allowed websites", detail: hasDomains ? org.allowedDomains!.join(", ") : "Choose which websites may display your widget.", href: "#domains", done: hasDomains, icon: Globe },
  ];
  const next = steps.find(step => !step.done);
  return <section className="mb-8 space-y-5">
    <div className="rounded-2xl bg-[#123A3E] p-5 text-white sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-medium uppercase tracking-widest text-emerald-100/70">Widget overview</p>
          <h1 className="mt-2 break-words text-2xl font-semibold">{org.name}</h1>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{org.isPaid ? "Activated" : "Payment pending"}</span>
      </div>
      <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200">Give your assistant the information your customers need. Set up its look and website access, then install it on your site.</p>
      <Link href={next?.href ?? "#install"} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#123A3E]">
        {next?.title ?? "Get installation code"}<ArrowUpRight size={16} />
      </Link>
    </div>
    <nav aria-label="Widget sections" className="flex flex-wrap gap-2 text-sm">
      {[['Knowledge', '/dashboard/knowledge-base'], ['Payment', '/dashboard/payment'], ['Design', '#design'], ['Domains', '#domains'], ['Install', '#install']].map(([label, href]) =>
        <Link key={label} href={href} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-600 hover:border-[#123A3E]">{label}</Link>)}
    </nav>
    <div className="grid gap-3 sm:grid-cols-2">
      {steps.map(step => <Link key={step.title} href={step.href} className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[#5B8266]">
        <div className="flex items-center justify-between gap-3"><step.icon size={20} className="text-[#123A3E]" /><span className={`text-xs ${step.done ? 'text-emerald-700' : 'text-slate-500'}`}>{step.done ? 'Configured' : 'To do'}</span></div>
        <h2 className="mt-4 text-sm font-semibold text-[#123A3E]">{step.title}</h2>
        <p className="mt-2 break-words text-sm leading-5 text-slate-500">{step.detail}</p>
      </Link>)}
    </div>
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600"><strong className="text-[#123A3E]">Managed AI is the default.</strong> You do not need your own AI provider key. Knowledge and appearance can be configured before activation.</div>
  </section>;
}
