"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ApiMessage } from "@/lib/chatApi";
import { AssistantBubble } from "./AssistantBubble";

function readableError(error: Error): string {
  try {
    const data = JSON.parse(error.message);
    if (typeof data.error === "string" && data.error.length < 300) return data.error;
  } catch { /* Network and stream errors need a plain fallback. */ }
  return "Could not complete your reply. Please try again.";
}

export function ChatPanel({
  initialMessages,
  onTurnComplete,
  orgSlug,
  embedKey,
  sessionId,
  visitorKey,
}: {
  initialMessages: ApiMessage[];
  onTurnComplete: (msgs: ApiMessage[]) => void;
  orgSlug?: string;
  embedKey?: string | null;
  sessionId: string;
  visitorKey?: string | null;
}) {
  const { messages, setMessages, sendMessage, status, error, regenerate, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { sessionId, ...(orgSlug ? { orgSlug, embedKey, visitorKey } : {}) },
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
    if (!orgSlug) inputRef.current?.focus();
  }, [orgSlug]);

  function handleSend() {
    if (!input.trim() || loading) return;
    stickToBottomRef.current = true;
    sendMessage({ text: input });
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend();
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 bg-[#EEF2F0] min-h-0"
      >
        <div ref={contentRef} className="mx-auto w-full max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="mx-auto max-w-md py-12 text-center">
              <h2 className="text-xl font-semibold text-[#123A3E]">{orgSlug ? "How can we help?" : "What would you like to work on?"}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">{orgSlug ? "Ask a question about this business." : "Ask a question, draft a reply, or explore your business knowledge."}</p>
            </div>
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
                  <div className="max-w-[85%] min-w-0 [overflow-wrap:anywhere] px-4 py-2 rounded-2xl text-sm leading-relaxed bg-[#123A3E] text-white rounded-br-sm border-t-4 border-[var(--widget-color,#123A3E)]">
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

      {error && <div role="alert" className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        {readableError(error)}
        <button onClick={() => regenerate()} className="ml-2 font-semibold underline">Retry</button>
      </div>}
      <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-3xl gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question..."
          aria-label="Your message"
          maxLength={8000}
          className="flex-1 min-w-0 px-4 py-2 rounded-full border border-slate-300 text-base sm:text-sm text-[#1F2E33] bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123A3E]"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="shrink-0 px-4 py-2 rounded-full bg-[#B5502A] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#9C4322] transition"
        >
          Send
        </button>
        {loading && <button onClick={() => stop()} className="shrink-0 rounded-full border border-slate-300 px-3 text-sm text-slate-600">Stop</button>}
      </div>
      </div>
    </div>
  );
}
