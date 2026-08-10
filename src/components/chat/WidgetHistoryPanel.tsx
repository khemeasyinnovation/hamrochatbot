"use client";

import { WidgetSession } from "@/lib/widgetApi";

export function WidgetHistoryPanel({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
}: {
  sessions: WidgetSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 bg-[#F7F5F0] flex flex-col">
      <div className="px-3 py-3 border-b border-slate-200">
        <button
          onClick={onNewChat}
          className="w-full px-3 py-2 rounded-lg bg-[#123A3E] text-white text-sm font-medium hover:bg-[#0D2E31] transition"
        >
          + New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {sessions.length === 0 && (
          <p className="text-slate-400 text-xs px-2 py-4">No past chats yet.</p>
        )}
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition ${
              s.id === currentSessionId
                ? "bg-[#123A3E]/10 text-[#123A3E] font-medium"
                : "hover:bg-[#123A3E]/5 text-[#1F2E33]"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>
    </div>
  );
}