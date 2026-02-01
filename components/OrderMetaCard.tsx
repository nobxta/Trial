"use client";

import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";

interface OrderMetaCardProps {
  orderId: string;
  timeRemaining: number;
  createdAt: Date;
  isExpired: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function OrderMetaCard({
  orderId,
  timeRemaining: initialTimeRemaining,
  createdAt,
  isExpired,
}: OrderMetaCardProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  useEffect(() => {
    if (isExpired) {
      setTimeRemaining(0);
      return;
    }
    const interval = setInterval(() => {
      setTimeRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isExpired]);

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopiedOrderId(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
      setTimeout(() => setCopiedOrderId(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const isLowTime = !isExpired && timeRemaining > 0 && timeRemaining <= 120;

  return (
    <div className="bg-[#1a1d23]/40 backdrop-blur-xl border border-white/[0.05] rounded-2xl shadow-xl shadow-black/20 p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Order details
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-400">Order ID</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-white truncate">{orderId}</span>
            <button
              type="button"
              onClick={copyOrderId}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-white/5 transition-colors shrink-0"
              aria-label="Copy Order ID"
            >
              {copiedOrderId ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-400">{isExpired ? "Status" : "Time remaining"}</span>
          {isExpired ? (
            <span className="text-red-400 font-medium">Expired</span>
          ) : (
            <span
              className={`font-mono font-semibold ${
                isLowTime
                  ? "text-orange-500 animate-pulse"
                  : "text-gray-300"
              }`}
            >
              {formatTime(timeRemaining)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-400">Created</span>
          <span className="text-gray-300">
            {createdAt.toLocaleString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
