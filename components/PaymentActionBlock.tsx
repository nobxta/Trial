"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

function truncateAddress(address: string, start = 6, end = 4): string {
  if (!address || address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

interface PaymentActionBlockProps {
  depositAmount: string;
  depositSymbol: string;
  depositAddress: string;
  isExpired: boolean;
}

export default function PaymentActionBlock({
  depositAmount,
  depositSymbol,
  depositAddress,
  isExpired,
}: PaymentActionBlockProps) {
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const copyAddress = useCallback(async () => {
    if (isExpired || !depositAddress) return;
    try {
      await navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      setShowToast(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
      const t = setTimeout(() => {
        setCopied(false);
        setShowToast(false);
      }, 2000);
      return () => clearTimeout(t);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }, [depositAddress, isExpired]);

  if (!depositAddress) return null;

  return (
    <div className="bg-[#1a1d23]/60 backdrop-blur-xl border border-white/[0.05] rounded-2xl shadow-2xl shadow-black/20 p-6">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Payment
      </div>
      <div className="font-sans text-3xl font-bold text-white mb-4">
        Send {depositAmount} {depositSymbol}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <code
          className={`flex-1 min-w-0 font-mono text-lg text-white truncate ${
            isExpired ? "line-through text-gray-500" : ""
          }`}
          title={depositAddress}
        >
          {truncateAddress(depositAddress)}
        </code>
        {!isExpired && (
          <button
            type="button"
            onClick={copyAddress}
            className="flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-6 py-3 rounded-xl bg-[#2563eb] hover:bg-[#3b82f6] text-white font-semibold transition-all hover:shadow-[0_0_15px_rgba(37,99,235,0.5)] active:scale-[0.98] shrink-0"
            aria-label="Copy deposit address"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" aria-hidden />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" aria-hidden />
                <span>Copy Address</span>
              </>
            )}
          </button>
        )}
      </div>
      {/* Success toast */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-xl shadow-lg"
        >
          Copied to clipboard!
        </div>
      )}
    </div>
  );
}
