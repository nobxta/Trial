"use client";

import CryptoIcon from "./CryptoIcon";

interface OrderSummaryProps {
  sendAmount: string;
  sendSymbol: string;
  sendDisplayName?: string;
  sendIconUrl?: string;
  sendAmountUsd?: number;
  receiveAmount: string;
  receiveSymbol: string;
  receiveDisplayName?: string;
  receiveIconUrl?: string;
}

export default function OrderSummary({
  sendAmount,
  sendSymbol,
  sendDisplayName,
  sendIconUrl,
  receiveAmount,
  receiveSymbol,
  receiveDisplayName,
  receiveIconUrl,
}: OrderSummaryProps) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#12161f] p-6 sm:p-8">
      <div className="grid grid-cols-2 md:flex md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
        <div className="flex flex-1 flex-col items-center md:items-start text-center md:text-left min-w-0">
          <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-1">You Pay</div>
          <div className="flex items-center gap-2 min-w-0 justify-center md:justify-start">
            <CryptoIcon
              symbol={sendSymbol}
              className="w-8 h-8 shrink-0"
              imageUrl={sendIconUrl || `https://nowpayments.io/images/coins/${sendSymbol.toLowerCase()}.svg`}
            />
            <div className="min-w-0">
              <div className="text-white font-semibold text-xl sm:text-2xl md:text-4xl truncate">{sendAmount}</div>
              <div className="text-slate-500 text-xs sm:text-sm truncate">{sendDisplayName || sendSymbol}</div>
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-white/5 border border-white/5 text-slate-500 backdrop-blur-sm" aria-hidden>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </div>
        <div className="flex flex-1 flex-col items-center md:items-end text-center md:text-right min-w-0">
          <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-1">You Receive</div>
          <div className="flex items-center gap-2 min-w-0 justify-center md:justify-end">
            <div className="min-w-0 text-center md:text-right">
              <div className="text-white font-semibold text-xl sm:text-2xl md:text-4xl truncate">{receiveAmount}</div>
              <div className="text-slate-500 text-xs sm:text-sm truncate">{receiveDisplayName || receiveSymbol}</div>
            </div>
            <CryptoIcon
              symbol={receiveSymbol}
              className="w-8 h-8 shrink-0"
              imageUrl={receiveIconUrl || `https://nowpayments.io/images/coins/${receiveSymbol.toLowerCase()}.svg`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
