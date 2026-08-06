import type { Components } from "react-markdown";

export const markdownComponents: Components = {
  p: ({ node, ref, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ node, ref, ...props }) => (
    <ul className="list-disc pl-5 my-2 space-y-1" {...props} />
  ),
  ol: ({ node, ref, ...props }) => (
    <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />
  ),
  li: ({ node, ref, ...props }) => <li className="mb-1" {...props} />,
  strong: ({ node, ref, ...props }) => (
    <strong className="font-bold text-[#0b2545]" {...props} />
  ),
  table: ({ node, ref, ...props }) => (
    <div className="overflow-x-auto my-2 -mx-1">
      <table className="text-xs border-collapse w-full" {...props} />
    </div>
  ),
  thead: ({ node, ref, ...props }) => (
    <thead className="bg-slate-100" {...props} />
  ),
  th: ({ node, ref, ...props }) => (
    <th
      className="border border-slate-200 px-2 py-1 text-left font-semibold whitespace-nowrap"
      {...props}
    />
  ),
  td: ({ node, ref, ...props }) => (
    <td className="border border-slate-200 px-2 py-1 align-top" {...props} />
  ),
};