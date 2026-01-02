"use client";

import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import CryptoIcon from "./CryptoIcon";

interface OrderDetailsProps {
  orderId: string;
  depositAmount: string;
  depositSymbol: string;
  depositDisplayName?: string;
  depositIconUrl?: string;
  depositAddress: string;
  orderType: string;
  confirmationsNeeded: number;
  timeRemaining: number;
  createdAt: Date;
  isExpired: boolean;
  receiveSymbol: string;
  receiveDisplayName?: string;
  internalStatus?: string;
}

export default function OrderDetails({
  orderId,
  depositAmount,
  depositSymbol,
  depositDisplayName,
  depositIconUrl,
  depositAddress,
  orderType,
  confirmationsNeeded,
  timeRemaining: initialTimeRemaining,
  createdAt,
  isExpired,
  receiveSymbol,
  receiveDisplayName,
  internalStatus,
}: OrderDetailsProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Only update time remaining if order is not expired
  useEffect(() => {
    if (isExpired) {
      setTimeRemaining(0);
      return;
    }
    
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isExpired]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const copyToClipboard = async (text: string, type: "address" | "order") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "address") {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } else {
        setCopiedOrderId(true);
        setTimeout(() => setCopiedOrderId(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Order Meta Information */}
      <div className="bg-gradient-to-br from-[#0f1115] to-[#141820] rounded-2xl border border-[#1e2329]/60 shadow-lg p-6 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-2">
              Order ID
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-mono font-semibold text-white">{orderId}</span>
              <button
                onClick={() => copyToClipboard(orderId, "order")}
                className="p-1.5 hover:bg-[#1e2329] rounded-lg transition-colors"
                title="Copy Order ID"
              >
                {copiedOrderId ? (
                  <Check className="w-4 h-4 text-[#10b981]" />
                ) : (
                  <Copy className="w-4 h-4 text-[#8b949e] hover:text-white" />
                )}
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-2">
              {isExpired ? "Status" : "Time Remaining"}
            </div>
            {isExpired ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                  Expired
                </span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-[#3b82f6] font-mono">
                {formatTime(timeRemaining)}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-2">
              Pricing Mode
            </div>
            <div className="text-base font-medium text-white">{orderType}</div>
          </div>

          <div>
            <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-2">
              Creation Time
            </div>
            <div className="text-base font-medium text-white">
              {createdAt.toLocaleString("en-US", {
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Payment / Deposit Section */}
      <div className={`bg-gradient-to-br from-[#0f1115] to-[#141820] rounded-2xl border shadow-lg p-6 sm:p-8 ${
        isExpired ? 'border-[#dc2626]/30 opacity-75' : 'border-[#1e2329]/60'
      }`}>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-5">
            <CryptoIcon 
              symbol={depositSymbol} 
              className="w-8 h-8"
              imageUrl={depositIconUrl || `https://nowpayments.io/images/coins/${depositSymbol.toLowerCase()}.svg`}
            />
            <div>
              <h3 className="text-xl font-bold text-white">
                Send {depositAmount} {depositDisplayName || depositSymbol} to this address
              </h3>
              {!isExpired && (
                <p className="text-sm text-[#8b949e] mt-1">
                  Use the address below to complete your payment
                </p>
              )}
            </div>
          </div>
          
          <div className={`relative flex items-center gap-3 bg-[#0a0d11] rounded-xl p-4 border ${
            isExpired 
              ? 'border-red-500/30' 
              : 'border-[#1e2329] hover:border-[#2a2f36] transition-colors'
          }`}>
            <code className={`flex-1 text-sm sm:text-base font-mono break-all ${
              isExpired 
                ? 'line-through text-[#6b7280]' 
                : 'text-white'
            }`}>
              {depositAddress}
            </code>
            {!isExpired && (
              <button
                onClick={() => copyToClipboard(depositAddress, "address")}
                className="flex-shrink-0 p-2.5 bg-[#1e2329] hover:bg-[#2a2f36] rounded-lg transition-colors border border-[#2a2f36]"
                title="Copy Address"
              >
                {copiedAddress ? (
                  <Check className="w-5 h-5 text-[#10b981]" />
                ) : (
                  <Copy className="w-5 h-5 text-[#8b949e] hover:text-white" />
                )}
              </button>
            )}
          </div>
        </div>

        {isExpired ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-red-400 mb-1">
                  Payment Window Expired
                </div>
                <div className="text-sm text-[#8b949e]">
                  This payment window has expired. Please create a new order to continue.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-[#1e3a5f]/20 border border-[#3b82f6]/20 rounded-xl">
            <div className="text-sm text-[#8b949e] leading-relaxed">
              The exchange rate will be fixed after receiving{" "}
              <span className="font-semibold text-white">{confirmationsNeeded} network confirmation{confirmationsNeeded > 1 ? "s" : ""}</span>.
              Then your funds will be sent to your destination address.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

