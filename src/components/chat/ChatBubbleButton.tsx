"use client";

export function ChatBubbleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#0b2545] text-white shadow-lg flex items-center justify-center hover:scale-105 transition font-sans"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.5 0-2.91-.32-4.14-.88L3 20l1.05-3.16C3.38 15.66 3 14.37 3 13c0-4.418 4.03-8 9-8s9 3.582 9 7z" />
      </svg>
    </button>
  );
}