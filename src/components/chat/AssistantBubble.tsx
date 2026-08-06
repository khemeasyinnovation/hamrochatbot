"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "./markdownComponents";

function useTypewriter(fullText: string, animate: boolean) {
  const [displayed, setDisplayed] = useState(animate ? "" : fullText);
  const posRef = useRef(animate ? 0 : fullText.length);

  useEffect(() => {
    if (!animate) {
      setDisplayed(fullText);
      posRef.current = fullText.length;
      return;
    }
    if (posRef.current >= fullText.length) return;

    const id = setInterval(() => {
      let next = Math.min(posRef.current + 4, fullText.length);
      while (
        next < fullText.length &&
        fullText[next] !== " " &&
        fullText[next] !== "\n"
      ) {
        next++;
      }
      posRef.current = next;
      setDisplayed(fullText.slice(0, posRef.current));
      if (posRef.current >= fullText.length) clearInterval(id);
    }, 35);

    return () => clearInterval(id);
  }, [fullText, animate]);

  return displayed;
}

export function AssistantBubble({
  text,
  animate,
}: {
  text: string;
  animate: boolean;
}) {
  const displayed = useTypewriter(text, animate);
  const stillTyping = animate && displayed.length < text.length;

  return (
    <div className="max-w-[85%] px-4 py-2 rounded-2xl text-sm leading-relaxed bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {displayed || "\u200b"}
      </ReactMarkdown>
      {stillTyping && (
        <span className="inline-block w-1.5 h-4 bg-slate-400 ml-0.5 animate-pulse align-middle" />
      )}
    </div>
  );
}