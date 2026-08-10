"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DashboardChatProvider,
  useDashboardChat,
} from "@/components/chat/DashboardChatContext";
import { ConfirmDialog } from "@/components/chat/ConfirmDialog";

const NAV_ITEMS = [
  { href: "/dashboard/widget", label: "Widget Setup" },
  { href: "/dashboard/knowledge-base", label: "Knowledge Base" },
  { href: "/dashboard/payment", label: "Payment" },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    sessions,
    currentSessionId,
    selectSession,
    newChat,
    deleteSession,
    logout,
  } = useDashboardChat();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
  const onChatPage = pathname?.startsWith("/dashboard/chat");

  async function handleSelect(id: string) {
    await selectSession(id);
    setChatHistoryOpen(false);
    if (!onChatPage) router.push("/dashboard/chat");
    onClose();
  }

  async function handleNewChat() {
    await newChat();
    setChatHistoryOpen(false);
    if (!onChatPage) router.push("/dashboard/chat");
    onClose();
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    await deleteSession(pendingDeleteId);
    setPendingDeleteId(null);
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`w-64 md:w-56 shrink-0 bg-[#123A3E] text-white flex flex-col fixed md:static inset-y-0 left-0 z-40 transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Hamro Chat Assistant</p>
            <p className="text-slate-300 text-xs">Dashboard</p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-slate-300 hover:text-white text-xl leading-none"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <div className="h-px bg-gradient-to-r from-white/30 to-transparent" />

        <nav className="flex-1 px-2 py-4 space-y-1">
          {/* Chat — floating popup instead of inline-expanding list */}
          <div className="relative">
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                onChatPage || chatHistoryOpen
                  ? "bg-white/10 text-white font-medium"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
              onClick={() => {
                router.push("/dashboard/chat");
                setChatHistoryOpen(false);
                onClose();
              }}
            >
              <span>Chat</span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNewChat();
                  }}
                  title="New chat"
                  aria-label="New chat"
                  className="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-base leading-none"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChatHistoryOpen((prev) => !prev);
                  }}
                  title="Chat history"
                  aria-label="Chat history"
                  className="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <span
                    className={`inline-block text-[10px] transition-transform ${chatHistoryOpen ? "rotate-180" : ""}`}
                  >
                    ▼
                  </span>
                </button>
              </div>
            </div>

            {chatHistoryOpen && (
              <div className="absolute left-1/2 top-10 ml-2 w-48 z-50">
                <div className="bg-[#123A3E]/70  border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between">
                    <p className="text-[11px] text-slate-300">
                      {sessions.length}{" "}
                      {sessions.length === 1 ? "chat" : "chats"}
                    </p>
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="px-2 py-1 rounded-md text-[11px] bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Start a new chat"
                    >
                      + New
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatHistoryOpen(false)}
                      className="text-slate-300 hover:text-white text-lg leading-none"
                      aria-label="Close chat history"
                    >
                      ×
                    </button>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto p-1.5">
                    {sessions.length === 0 ? (
                      <p className="text-slate-400 text-xs px-2 py-3 text-center">
                        No past chats yet.
                      </p>
                    ) : (
                      <div className="space-y-0.5">
                        {sessions.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => handleSelect(s.id)}
                            className={`group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                              s.id === currentSessionId
                                ? "bg-white/15 text-white"
                                : "text-slate-300 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <span className="truncate min-w-0">{s.title}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingDeleteId(s.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 hover:text-red-400 shrink-0 transition-opacity"
                              title="Delete chat"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
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

        <div className="border-t border-white/10 px-3 py-3">
          {user && user !== "loading" && (
            <>
              <p className="text-xs text-center text-slate-300 truncate mb-2">
                {user.email}
              </p>
              <div className="flex justify-center gap-2 mb-2">
                <button
                  onClick={logout}
                  className="w-fit mx-auto border-2 bg-blue-900 text-center  border-white/10 text-xs text-slate-300 hover:text-white px-4 py-1 rounded-lg transition-colors"
                >
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Rendered OUTSIDE the transformed <aside> on purpose -- a CSS
          transform on an ancestor creates a new containing block for
          fixed-position descendants, which was pinning this dialog to
          the sidebar's own narrow box instead of centering on screen. */}
      <ConfirmDialog
        open={pendingDeleteId !== null}
        message="Are you sure you want to delete this chat?"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </>
  );
}

function MobileTopBar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#123A3E] text-white shrink-0">
      <button onClick={onOpenSidebar} aria-label="Open menu">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>
      <p className="font-semibold text-sm">Hamro Chat Assistant</p>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <DashboardChatProvider>
      <div className="h-screen flex flex-col md:flex-row bg-[#EEF2F0] overflow-hidden">
        <MobileTopBar onOpenSidebar={() => setSidebarOpen(true)} />
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 min-w-0 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </DashboardChatProvider>
  );
}
