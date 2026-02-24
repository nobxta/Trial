"use client";

import { ArrowRight } from "lucide-react";
import CryptoIcon from "./CryptoIcon";

interface OrderSummaryProps {
  sendAmount: string;
  sendSymbol: string;
  sendNetwork?: string;
  sendDisplayName?: string;
  sendIconUrl?: string;
  receiveAmount: string;
  receiveSymbol: string;
  receiveNetwork?: string;
  receiveDisplayName?: string;
  receiveIconUrl?: string;
  youPayLabel?: string;
  youReceiveLabel?: string;
  status?: string;
  statusType?: "awaiting" | "confirming" | "exchanging" | "completed" | "expired";
}

export default function OrderSummary({
  sendAmount,
  sendSymbol,
  sendNetwork,
  sendIconUrl,
  receiveAmount,
  receiveSymbol,
  receiveNetwork,
  receiveIconUrl,
  youPayLabel = "You Pay",
  youReceiveLabel = "You Receive",
  status,
  statusType = "awaiting",
}: OrderSummaryProps) {
  const statusStyles = {
    awaiting: { bg: "rgba(34, 197, 94, 0.2)", text: "#22C55E", dot: "#22C55E" },
    confirming: { bg: "rgba(59, 130, 246, 0.2)", text: "#3B82F6", dot: "#3B82F6" },
    exchanging: { bg: "rgba(245, 158, 11, 0.2)", text: "#F59E0B", dot: "#F59E0B" },
    completed: { bg: "rgba(34, 197, 94, 0.2)", text: "#22C55E", dot: "#22C55E" },
    expired: { bg: "rgba(239, 68, 68, 0.2)", text: "#EF4444", dot: "#EF4444" },
  };

  const currentStatus = statusStyles[statusType];

  return (
    <div 
      className="rounded-[20px] border border-white/10 bg-[#12161F] shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
      style={{ padding: '20px 32px' }}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
        {/* You Pay Section */}
        <div className="flex items-center gap-4">
          <CryptoIcon
            symbol={sendSymbol}
            className="w-12 h-12 shrink-0 rounded-full"
            imageUrl={sendIconUrl}
          />
          <div className="flex flex-col gap-1">
            <span 
              className="text-xs font-medium"
              style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}
            >
              {youPayLabel}
            </span>
            <div className="flex items-center gap-2">
              <span 
                className="text-xl font-bold text-white"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                {sendAmount} {sendSymbol}
              </span>
              {sendNetwork && (
                <span 
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#1E2533]"
                  style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}
                >
                  {sendNetwork}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Arrow Connector - NO LINES on mobile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Gradient line left - desktop only */}
          <div 
            className="hidden md:block w-[60px] h-[2px]"
            style={{ background: 'linear-gradient(90deg, #1E2533 0%, #3B82F6 100%)' }}
          />
          
          {/* Arrow circle */}
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ 
              backgroundColor: '#1A1F2B',
              border: '2px solid #2563EB'
            }}
          >
            <ArrowRight className="w-[18px] h-[18px] text-white" />
          </div>
          
          {/* Gradient line right - desktop only */}
          <div 
            className="hidden md:block w-[60px] h-[2px]"
            style={{ background: 'linear-gradient(90deg, #3B82F6 0%, #1E2533 100%)' }}
          />
        </div>

        {/* You Receive Section */}
        <div className="flex items-center gap-4">
          <CryptoIcon
            symbol={receiveSymbol}
            className="w-12 h-12 shrink-0 rounded-full"
            imageUrl={receiveIconUrl}
          />
          <div className="flex flex-col gap-1">
            <span 
              className="text-xs font-medium"
              style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}
            >
              {youReceiveLabel}
            </span>
            <div className="flex items-center gap-2">
              <span 
                className="text-xl font-bold text-white"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                {receiveAmount} {receiveSymbol}
              </span>
              {receiveNetwork && (
                <span 
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#1E2533]"
                  style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}
                >
                  {receiveNetwork}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Badge - Just dot and text, NO line */}
        {status && (
          <div 
            className="flex items-center gap-2 px-4 py-2 rounded-[20px]"
            style={{ backgroundColor: currentStatus.bg }}
          >
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: currentStatus.dot }}
            />
            <span 
              className="text-[13px] font-semibold"
              style={{ fontFamily: 'Inter, sans-serif', color: currentStatus.text }}
            >
              {status}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
