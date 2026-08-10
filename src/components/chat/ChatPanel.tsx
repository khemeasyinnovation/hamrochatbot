"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ApiMessage } from "@/lib/chatApi";
import { AssistantBubble } from "./AssistantBubble";

export function ChatPanel({
  initialMessages,
  onTurnComplete,
  orgSlug,
  embedKey,
}: {
  initialMessages: ApiMessage[];
  onTurnComplete: (msgs: ApiMessage[]) => void;
  orgSlug?: string;
  embedKey?: string | null;
}) {
  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: orgSlug ? { orgSlug, embedKey } : undefined,
    }),
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);
  const lastSavedCountRef = useRef(0);
  const stickToBottomRef = useRef(true);

  const initialIdsRef = useRef<Set<string>>(
    new Set(initialMessages.map((m) => m.id)),
  );

  const loading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (initialMessages.length > 0) setMessages(initialMessages as any);
    lastSavedCountRef.current = initialMessages.length;
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current || loading) return;
    if (messages.length === 0 || messages.length === lastSavedCountRef.current)
      return;
    lastSavedCountRef.current = messages.length;
    onTurnComplete(messages as unknown as ApiMessage[]);
  }, [messages, loading, onTurnComplete]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;
  }

  useEffect(() => {
    const container = scrollRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const observer = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        container.scrollTop = container.scrollHeight;
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    stickToBottomRef.current = true;
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSend() {
    if (!input.trim()) return;
    stickToBottomRef.current = true;
    sendMessage({ text: input });
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSend();
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 bg-[#EEF2F0] min-h-0"
      >
        <div ref={contentRef} className="space-y-3">
          {messages.length === 0 && (
            <p className="text-slate-400 text-sm text-center mt-10">
              Ask about Queries or concerns.
            </p>
          )}

          {messages.map((msg) => {
            const text =
              msg.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") ||
              "";
            const isNew = !initialIdsRef.current.has(msg.id);

            return (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" ? (
                  <AssistantBubble text={text} animate={isNew} />
                ) : (
                  <div className="max-w-[85%] px-4 py-2 rounded-2xl text-sm leading-relaxed bg-[#123A3E] text-white rounded-br-sm">
                    <span>{text}</span>
                  </div>
                )}
              </div>
            );
          })}

          {status === "submitted" && (
            <div className="flex justify-start">
              <div className="px-4 py-2 flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 flex gap-2 px-3 py-2 border-t border-slate-200 bg-white">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question..."
          className="flex-1 px-4 py-2 rounded-full border border-slate-300 text-sm text-[#1F2E33] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123A3E]"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="px-5 py-2 rounded-full bg-[#B5502A] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#9C4322] transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}