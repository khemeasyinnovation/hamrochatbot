"use client";

import { ChatPanel } from "./ChatPanel";
import { useDashboardChat } from "./DashboardChatContext";

export function DashboardChatView() {
  const { user, currentSessionId, currentMessages, loadingSession, turnComplete } = useDashboardChat();

  if (user === "loading") {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        Loading...
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        You're not logged in.{" "}
        <a href="/" className="text-[#123A3E] underline ml-1">
          Log in
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <p className="font-semibold text-sm text-[#123A3E]">Hamrobot Assistant</p>
        <p className="text-slate-400 text-xs">Chat with our AI assistant</p>
      </div>

      {loadingSession ? (
        <div className="flex-1 flex items-center justify-center bg-[#EEF2F0] text-slate-400 text-sm">
          Loading chat...
        </div>
      ) : currentSessionId ? (
        <ChatPanel key={currentSessionId} sessionId={currentSessionId} initialMessages={currentMessages} onTurnComplete={turnComplete} />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#EEF2F0] text-slate-400 text-sm">
          Setting up your chat...
        </div>
      )}
    </div>
  );
}
