"use client";

import { useState } from "react";
import { RobotMark } from "./RobotMark";
import { Settings } from "lucide-react";

export function WidgetTopBar({
  showExpandToggle,
  expanded,
  onToggleExpand,
  showHistoryToggle,
  historyOpen,
  onToggleHistory,
  onClose,
  widgetPosition,
  onTogglePosition,
}: {
  showExpandToggle: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  showHistoryToggle: boolean;
  historyOpen: boolean;
  onToggleHistory: () => void;
  onClose: () => void;
  isOwner?: boolean;
  widgetPosition?: "bottom-right" | "bottom-left";
  onTogglePosition?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white shrink-0 relative">
      <div className="flex items-center gap-1">
        <RobotMark className="shrink-0 rounded-lg bg-[var(--widget-color,#123A3E)] text-[var(--widget-foreground,#ffffff)]" />
        {showExpandToggle && (
          <button
            onClick={onToggleExpand}
            aria-label={expanded ? "Collapse chat" : "Expand chat"}
            title={expanded ? "Collapse" : "Expand"}
            className="w-9 h-9 flex items-center justify-center rounded-md text-[#123A3E] hover:bg-[#123A3E]/10 transition"
          >
            {expanded ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 3H3v6M15 21h6v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            )}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        {showHistoryToggle && (
          <button
            onClick={onToggleHistory}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
              historyOpen ? "bg-[#123A3E] text-white" : "text-[#123A3E] hover:bg-[#123A3E]/10"
            }`}
          >
            {historyOpen ? "Back" : "Chats"}
          </button>
        )}

        {onTogglePosition && (
  <button
    onClick={onTogglePosition}
    aria-label="Switch launcher side"
    title="Switch launcher side"
    className="w-9 h-9 flex items-center justify-center rounded-md text-[#123A3E] hover:bg-[#123A3E]/10 transition"
  >
    {widgetPosition === "bottom-left" ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </button>
)}

        <div className="relative">
          <button
            aria-label="Widget menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-md text-[#123A3E] hover:bg-[#123A3E]/10 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 w-auto bg-white border border-slate-200 rounded-lg shadow-lg px-1 py-1 z-10">
              
              <a  href="https://hamrobot.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="block px-1 py-2 text-xs text-slate-600 hover:bg-slate-50"
              >
                <Settings />
              </a>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          aria-label="Close chat"
          title="Close"
          className="w-9 h-9 flex items-center justify-center rounded-md text-[#123A3E] hover:bg-[#123A3E]/10 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6L18 18M6 18L18 6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}