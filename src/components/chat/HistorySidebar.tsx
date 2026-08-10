"use client";

import { useState } from "react";
import { ApiSession, ApiUser } from "@/lib/chatApi";
import { ConfirmDialog } from "./ConfirmDialog";

export function HistorySidebar({
  open,
  user,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onLogout,
  onClose,
  variant = "overlay",
}: {
  open: boolean;
  user: ApiUser;
  sessions: ApiSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => Promise<void>;
  onLogout: () => void;
  onClose: () => void;
  variant?: "overlay" | "inline";
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const isInline = variant === "inline";

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    await onDeleteSession(pendingDeleteId);
    setPendingDeleteId(null);
  }

  const panelClasses = isInline
    ? "relative w-64 shrink-0 bg-[#F7F5F0] border-r border-slate-200 text-[#1F2E33] flex flex-col h-full"
    : `absolute inset-y-0 left-0 z-20 w-64 bg-[#0C2B2E] text-white flex flex-col transition-transform duration-200 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`;

  return (
    <>
      <div className={panelClasses}>
        <div
          className={`px-4 py-4 border-b flex items-center justify-between ${
            isInline ? "border-slate-200" : "border-white/10"
          }`}
        >
          <p
            className={`font-semibold text-sm truncate ${
              isInline ? "text-[#123A3E]" : "text-white"
            }`}
          >
            {user.email}
          </p>
          {!isInline && (
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white text-lg"
            >
              ×
            </button>
          )}
        </div>

        <button
          onClick={onNewChat}
          className={`mx-3 mt-3 px-3 py-2 rounded-lg text-sm text-left transition ${
            isInline
              ? "bg-[#123A3E] text-white hover:bg-[#0D2E31]"
              : "bg-white/10 hover:bg-white/20"
          }`}
        >
          + New chat
        </button>

        <div className="flex-1 overflow-y-auto mt-3 px-2 space-y-1">
          {sessions.length === 0 && (
            <p
              className={`text-xs px-2 py-4 ${
                isInline ? "text-slate-400" : "text-slate-400"
              }`}
            >
              No past chats yet.
            </p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelectSession(s.id)}
              className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer ${
                isInline
                  ? s.id === currentSessionId
                    ? "bg-[#123A3E]/10 text-[#123A3E] font-medium"
                    : "hover:bg-[#123A3E]/5 text-[#1F2E33]"
                  : s.id === currentSessionId
                    ? "bg-white/15"
                    : "hover:bg-white/10"
              }`}
            >
              <span className="truncate">{s.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDeleteId(s.id);
                }}
                className={`opacity-0 group-hover:opacity-100 text-xs shrink-0 transition ${
                  isInline
                    ? "text-slate-400 hover:text-[#B5502A]"
                    : "text-slate-300 hover:text-red-400"
                }`}
                title="Delete chat"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onLogout}
          className={`m-3 px-3 py-2 rounded-lg text-xs text-left ${
            isInline
              ? "text-slate-500 hover:bg-[#123A3E]/5"
              : "text-slate-300 hover:bg-white/10"
          }`}
        >
          Log out
        </button>
      </div>

      {!isInline && open && (
        <div className="absolute inset-0 bg-black/40 z-10" onClick={onClose} />
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        message="Are you sure you want to delete this chat?"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </>
  );
}