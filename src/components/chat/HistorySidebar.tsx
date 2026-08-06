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
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    await onDeleteSession(pendingDeleteId);
    setPendingDeleteId(null);
  }

  return (
    <>
      <div
        className={`absolute inset-y-0 left-0 z-20 w-64 bg-[#081b34] text-white flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
          <p className="font-semibold text-sm truncate">{user.email}</p>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white text-lg"
          >
            ×
          </button>
        </div>

        <button
          onClick={onNewChat}
          className="mx-3 mt-3 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-left transition"
        >
          + New chat
        </button>

        <div className="flex-1 overflow-y-auto mt-3 px-2 space-y-1">
          {sessions.length === 0 && (
            <p className="text-slate-400 text-xs px-2 py-4">No past chats yet.</p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelectSession(s.id)}
              className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer ${
                s.id === currentSessionId ? "bg-white/15" : "hover:bg-white/10"
              }`}
            >
              <span className="truncate">{s.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDeleteId(s.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 text-xs shrink-0 transition"
                title="Delete chat"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onLogout}
          className="m-3 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/10 text-left"
        >
          Log out
        </button>
      </div>

      {open && (
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