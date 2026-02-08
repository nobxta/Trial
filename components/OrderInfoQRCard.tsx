"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Clock } from "lucide-react";

const CARD_CLASS =
  "rounded-lg border border-white/5 bg-[#12161f] p-6 md:p-8 h-full flex flex-col";

const LABEL_CLASS = "text-slate-500 text-[11px] uppercase tracking-wider shrink-0 min-w-[100px]";

interface OrderInfoQRCardProps {
  orderId: string;
  timeRemaining: number;
  createdAt: Date;
  orderType: string;
  isExpired: boolean;
  slim?: boolean;
  /** When false, hide time remaining/expired (timer only applies until first confirmation) */
  showTimeRemaining?: boolean;
  /** User-facing order status (e.g. "Waiting for payment") */
  status?: string;
  /** Optional fee line, e.g. "Included in rate" or "—" */
  feeLabel?: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function OrderInfoQRCard({
  orderId,
  timeRemaining: initialTimeRemaining,
  createdAt,
  orderType,
  isExpired,
  slim = false,
  showTimeRemaining = true,
  status,
  feeLabel,
}: OrderInfoQRCardProps) {
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);

  // Timer only runs while awaiting deposit. Clear as soon as status leaves NEW/AWAITING_DEPOSIT (showTimeRemaining becomes false).
  useEffect(() => {
    if (!showTimeRemaining || isExpired) {
      setTimeRemaining(0);
      return;
    }
    setTimeRemaining(initialTimeRemaining);
    const interval = setInterval(() => setTimeRemaining((p) => (p <= 1 ? 0 : p - 1)), 1000);
    return () => clearInterval(interval);
  }, [showTimeRemaining, isExpired, initialTimeRemaining]);

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopiedOrderId(true);
      if ("vibrate" in navigator) navigator.vibrate(10);
      setTimeout(() => setCopiedOrderId(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const timeStr = formatTime(timeRemaining);
  const isZeroTime = showTimeRemaining && !isExpired && timeRemaining === 0;

  const createdStr = createdAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className={CARD_CLASS + " min-w-0 overflow-visible text-center md:text-left items-center md:items-stretch"}>
      <div className={`${slim ? "space-y-5" : "space-y-4"} text-sm min-w-0 w-full flex flex-col`}>
        <div className="flex justify-between items-center gap-2 min-w-0">
          <span className={LABEL_CLASS}>Order ID</span>
          <div className="flex items-center gap-1 min-w-0 flex-1 justify-end overflow-hidden">
            <span className="font-mono text-white truncate text-xs font-medium">{orderId}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); copyOrderId(); }}
              className="shrink-0 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Copy Order ID"
            >
              {copiedOrderId ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        {showTimeRemaining && (
          <div className="flex justify-between items-center gap-2 min-w-0">
            <span className={LABEL_CLASS}>Time remaining</span>
            <span
              className={`font-mono inline-flex items-center gap-1 text-sm font-semibold ${isExpired || isZeroTime ? "text-red-500/90" : "text-[#00ffa3]"}`}
            >
              {!isExpired && <Clock className="w-4 h-4 text-slate-500 shrink-0" />}
              {isExpired ? "Expired" : timeStr}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center gap-2 min-w-0">
          <span className={LABEL_CLASS}>Order type</span>
          <span className="text-white text-xs sm:text-sm font-medium">{orderType}</span>
        </div>
        <div className="flex justify-between items-center gap-2 min-w-0">
          <span className={LABEL_CLASS}>Created</span>
          <span className="text-white text-xs sm:text-sm font-medium truncate">{createdStr}</span>
        </div>
        {status != null && status !== "" && (
          <div className="flex justify-between items-center gap-2 min-w-0">
            <span className={LABEL_CLASS}>Status</span>
            <span className="text-white text-xs sm:text-sm font-medium break-words text-right min-w-0">{status}</span>
          </div>
        )}
        {feeLabel != null && feeLabel !== "" && (
          <div className="flex justify-between items-start gap-2 min-w-0">
            <span className={LABEL_CLASS}>Network fee</span>
            <span className="text-white text-xs sm:text-sm font-medium text-right break-words min-w-0">{feeLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
