"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Timer, ShieldCheck, Zap, AlarmClock } from "lucide-react";

interface OrderInfoQRCardProps {
  orderId: string;
  timeRemaining: number;
  createdAt: Date;
  orderType: string;
  isExpired: boolean;
  slim?: boolean;
  showTimeRemaining?: boolean;
  status?: string;
  feeLabel?: string;
  compact?: boolean;
  /** fixed | floating — from backend */
  rateMode?: 'fixed' | 'floating' | null;
  /** true when fixed rate locked at provider */
  providerRateLocked?: boolean;
}

export default function OrderInfoQRCard({
  orderId,
  timeRemaining: initialTimeRemaining,
  createdAt,
  orderType,
  isExpired,
  showTimeRemaining = true,
  rateMode = null,
  providerRateLocked = false,
}: OrderInfoQRCardProps) {
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);

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

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isLowTime = timeRemaining < 120 && timeRemaining > 0;
  const isZeroTime = timeRemaining === 0;

  const createdStr = createdAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const timerBgColor = isExpired || isZeroTime || isLowTime ? '#EF4444' : '#F59E0B';
  const timerBgSoft = isExpired || isZeroTime || isLowTime ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)';
  const timerBorderColor = isExpired || isZeroTime || isLowTime ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)';

  return (
    <div 
      className="rounded-[20px] border border-white/10 bg-[#12161F] p-6 h-full flex flex-col shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 
          className="text-white font-bold text-base"
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          Order Details
        </h3>
        <div 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1F2B]"
        >
          <span 
            className="text-xs font-medium"
            style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}
          >
            ID:
          </span>
          <span 
            className="text-xs font-semibold text-white"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {orderId}
          </span>
          <button onClick={copyOrderId} className="ml-1">
            {copiedOrderId ? (
              <Check className="w-3.5 h-3.5 text-[#22C55E]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#64748B] hover:text-white transition-colors" />
            )}
          </button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="flex gap-4 mb-5">
        {/* Creation time */}
        <div className="flex-1 flex flex-col gap-2 p-4 rounded-xl bg-[#1A1F2B]">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)' }}
          >
            <Timer className="w-4 h-4 text-[#2563EB]" />
          </div>
          <span 
            className="text-[11px] font-medium"
            style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}
          >
            Creation time
          </span>
          <span 
            className="text-sm font-semibold text-white"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {createdStr}
          </span>
        </div>

        {/* Order Type + Rate mode description */}
        <div className="flex-1 flex flex-col gap-2 p-4 rounded-xl bg-[#1A1F2B]">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
          >
            <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
          </div>
          <span 
            className="text-[11px] font-medium"
            style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}
          >
            Order Type
          </span>
          <span 
            className="text-sm font-semibold text-white"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {orderType}
          </span>
          {rateMode === 'fixed' && providerRateLocked && (
            <span className="text-[10px] text-[#94A3B8]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Rate locked
            </span>
          )}
          {rateMode === 'floating' && (
            <span className="text-[10px] text-[#94A3B8]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Rate confirmed after 1 confirmation
            </span>
          )}
        </div>

        {/* Network Fee */}
        <div className="flex-1 flex flex-col gap-2 p-4 rounded-xl bg-[#1A1F2B]">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
          >
            <Zap className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <span 
            className="text-[11px] font-medium"
            style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}
          >
            Network Fee
          </span>
          <span 
            className="text-sm font-semibold text-white"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Included
          </span>
        </div>
      </div>

      {/* Timer Card */}
      {showTimeRemaining && (
        <div 
          className="flex items-center justify-between p-4 px-5 rounded-2xl"
          style={{ 
            background: `linear-gradient(180deg, ${timerBgSoft} 0%, transparent 100%)`,
            border: `1px solid ${timerBorderColor}`
          }}
        >
          {/* Left side */}
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: isExpired || isZeroTime || isLowTime ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)' }}
            >
              <AlarmClock className="w-5 h-5" style={{ color: timerBgColor }} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span 
                className="text-[11px] font-medium"
                style={{ fontFamily: 'Inter, sans-serif', color: timerBgColor }}
              >
                {isExpired ? 'Expired' : 'Time Remaining'}
              </span>
              <span 
                className="text-sm font-semibold text-white"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {isExpired ? 'Order has expired' : 'Complete your deposit before the timer expires.'}
              </span>
            </div>
          </div>

          {/* Right side - Timer display */}
          {!isExpired && (
            <div className="flex items-center gap-2">
              {/* Minutes */}
              <div 
                className="flex flex-col items-center px-3 py-2 rounded-lg"
                style={{ backgroundColor: timerBgColor }}
              >
                <span 
                  className="text-xl font-bold"
                  style={{ fontFamily: 'JetBrains Mono, monospace', color: '#0B0E14' }}
                >
                  {minutes.toString().padStart(2, '0')}
                </span>
                <span 
                  className="text-[10px] font-medium"
                  style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(11, 14, 20, 0.6)' }}
                >
                  min
                </span>
              </div>
              
              <span 
                className="text-xl font-bold"
                style={{ fontFamily: 'JetBrains Mono, monospace', color: timerBgColor }}
              >
                :
              </span>
              
              {/* Seconds */}
              <div 
                className="flex flex-col items-center px-3 py-2 rounded-lg"
                style={{ backgroundColor: timerBgColor }}
              >
                <span 
                  className="text-xl font-bold"
                  style={{ fontFamily: 'JetBrains Mono, monospace', color: '#0B0E14' }}
                >
                  {seconds.toString().padStart(2, '0')}
                </span>
                <span 
                  className="text-[10px] font-medium"
                  style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(11, 14, 20, 0.6)' }}
                >
                  sec
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
