"use client";

interface CopyToastProps {
  visible: boolean;
}

export default function CopyToast({ visible }: CopyToastProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-[#12161f] border border-white/10 text-white text-sm font-medium shadow-lg shadow-black/30 opacity-100 transition-opacity duration-200"
      role="status"
      aria-live="polite"
    >
      Copied to clipboard
    </div>
  );
}
