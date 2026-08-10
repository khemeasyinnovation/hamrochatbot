"use client";

export function ConfirmDialog({
  open,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40 bg-black/40 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-5">
        <p className="text-sm text-slate-700 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 rounded-lg text-sm text-white bg-[#B5502A] hover:bg-[#9C4322] transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}