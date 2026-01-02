"use client";

import CryptoIcon from "./CryptoIcon";

interface OrderSummaryProps {
  sendAmount: string; // Formatted crypto amount
  sendSymbol: string;
  sendDisplayName?: string;
  sendIconUrl?: string;
  sendAmountUsd?: number; // Optional USD equivalent for display
  receiveAmount: string; // Formatted crypto amount
  receiveSymbol: string;
  receiveDisplayName?: string;
  receiveIconUrl?: string;
}

export default function OrderSummary({
  sendAmount,
  sendSymbol,
  sendDisplayName,
  sendIconUrl,
  sendAmountUsd,
  receiveSymbol,
  receiveAmount,
  receiveDisplayName,
  receiveIconUrl,
}: OrderSummaryProps) {
  return (
    <div className="bg-gradient-to-br from-[#0f1115] via-[#141820] to-[#0f1115] rounded-3xl border border-[#1e2329]/60 shadow-2xl shadow-black/20 p-8 sm:p-10 mb-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
        {/* Send Section */}
        <div className="flex-1 w-full">
          <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-4">
            You Send
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <CryptoIcon 
                symbol={sendSymbol} 
                className="w-16 h-16 sm:w-20 sm:h-20"
                imageUrl={sendIconUrl || `https://nowpayments.io/images/coins/${sendSymbol.toLowerCase()}.svg`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-4xl sm:text-5xl font-bold text-white mb-1 leading-tight">
                {sendAmount}
              </div>
              <div className="text-xl sm:text-2xl font-semibold text-[#8b949e]">
                {sendDisplayName || sendSymbol}
              </div>
              {sendAmountUsd && (
                <div className="text-sm text-[#6b7280] mt-1">
                  (~{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(sendAmountUsd)})
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1e2329] border border-[#2a2f36] flex items-center justify-center">
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 text-[#3b82f6]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </div>
        </div>

        {/* Receive Section */}
        <div className="flex-1 w-full">
          <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-4">
            You Receive
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <CryptoIcon 
                symbol={receiveSymbol} 
                className="w-16 h-16 sm:w-20 sm:h-20"
                imageUrl={receiveIconUrl || `https://nowpayments.io/images/coins/${receiveSymbol.toLowerCase()}.svg`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-4xl sm:text-5xl font-bold text-white mb-1 leading-tight">
                {receiveAmount}
              </div>
              <div className="text-xl sm:text-2xl font-semibold text-[#8b949e]">
                {receiveDisplayName || receiveSymbol}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

