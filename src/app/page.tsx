"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.text }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") sendMessage();
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {/* Floating toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-[#0b2545] text-white shadow-lg flex items-center justify-center hover:scale-105 transition"
          aria-label="Open chat"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-0 sm:static sm:inset-auto flex sm:block">
          <div className="flex flex-col w-full h-full sm:w-96 sm:h-[560px] bg-white sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-[#0b2545] text-white px-4 py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Easy Real Estate Assistant</p>
                <p className="text-slate-300 text-xs">Properties in Kaski, Pokhara</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-300 hover:text-white text-xl leading-none"
                aria-label="Close chat"
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
              {messages.length === 0 && (
                <p className="text-slate-400 text-sm text-center mt-10">
                  Ask about properties, districts, or prices in Kaski.
                </p>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#0b2545] text-white rounded-br-sm"
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 text-slate-400 text-sm px-4 py-2 rounded-2xl rounded-bl-sm shadow-sm">
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2 p-3 border-t border-slate-200 bg-white">
              
              <input
  type="text"
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="Type your question..."
  className="flex-1 px-4 py-2 rounded-full border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b2545]"
/>
              <button
                onClick={sendMessage}
                disabled={loading}
                className="px-5 py-2 rounded-full bg-[#0b2545] text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}