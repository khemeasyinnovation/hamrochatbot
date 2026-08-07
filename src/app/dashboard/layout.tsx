"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard/chat", label: "Chat" },
  { href: "/dashboard/widget", label: "Widget Setup" },
  { href: "/dashboard/knowledge-base", label: "Knowledge Base" },
  { href: "/dashboard/payment", label: "Payment" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-56 shrink-0 bg-[#0b2545] text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="font-semibold text-sm">Easy Real Estate</p>
          <p className="text-slate-400 text-xs">Dashboard</p>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-white/10 text-white font-medium"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}