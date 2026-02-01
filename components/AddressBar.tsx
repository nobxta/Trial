"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

interface AddressBarProps {
  address: string;
  isExpired?: boolean;
}

export default function AddressBar({ address, isExpired = false }: AddressBarProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(async () => {
    if (isExpired || !address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }, [address, isExpired]);

  if (!address) return null;

  return (
    <div className="rounded-xl sm:rounded-full border border-white/5 border-slate-800/50 bg-[#1a1d23]/40 backdrop-blur-md px-4 py-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-card-enter transition-all duration-300 hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]">
      <div className="flex items-center gap-2 w-full min-w-0">
        <code
          className={`font-mono text-xs text-white break-all min-w-0 flex-1 ${isExpired ? "line-through text-slate-500" : ""}`}
          title={address}
        >
          {address}
        </code>
        {!isExpired && (
          <button
            type="button"
            onClick={copyAddress}
            className="shrink-0 w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
            aria-label="Copy address"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
