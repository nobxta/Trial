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
  isExpired: isExpiredProp,
  receiveSymbol,
  receiveDisplayName,
  internalStatus,
}: OrderDetailsProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);
  const [expiredByTimer, setExpiredByTimer] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  const isExpired = isExpiredProp || expiredByTimer;

  useEffect(() => {
    if (isExpiredProp) {
      setTimeRemaining(0);
      setExpiredByTimer(true);
      return;
    }
    setTimeRemaining(initialTimeRemaining);
  }, [isExpiredProp, initialTimeRemaining]);

  useEffect(() => {
    if (isExpired) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setExpiredByTimer(true);
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

  const cardClass = "bg-[#1a1d23]/60 backdrop-blur-xl border border-white/[0.05] rounded-2xl shadow-2xl shadow-black/20";
  const under10Min = !isExpired && timeRemaining > 0 && timeRemaining < 600;

  const labelClass = "text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0 min-w-[100px]";

  return (
    <div className="space-y-6">
      {/* Order Meta Information */}
      <div className={`${cardClass} p-4 sm:p-8`}>
        <div className="flex flex-col gap-4 sm:gap-5">
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 min-w-0">
            <span className={labelClass}>Order ID</span>
            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end sm:justify-end">
              <span className="text-sm sm:text-base font-mono font-semibold text-white truncate">{orderId}</span>
              <button
                onClick={() => copyToClipboard(orderId, "order")}
                className="relative p-1.5 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-blue-500 shrink-0"
                title="Copy Order ID"
              >
                {copiedOrderId ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-white rounded shadow-lg whitespace-nowrap">Copied!</span>
                  </>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 min-w-0">
            <span className={labelClass}>{isExpired ? "Status" : "Time Remaining"}</span>
            {isExpired ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                Expired
              </span>
            ) : (
              <span className={`text-xl sm:text-2xl font-bold font-mono ${under10Min ? "text-amber-400" : "text-blue-500"}`}>
                {formatTime(timeRemaining)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 min-w-0">
            <span className={labelClass}>Pricing Mode</span>
            <span className="text-sm sm:text-base font-medium text-white text-right">{orderType}</span>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 min-w-0">
            <span className={labelClass}>Creation Time</span>
            <span className="text-sm sm:text-base font-medium text-white text-right">
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

      {/* Payment / Deposit Section */}
      <div className={`${cardClass} p-4 sm:p-8 transition-all duration-300 ${isExpired ? "border-red-500/30 opacity-90 grayscale backdrop-blur-sm" : ""}`}>
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <CryptoIcon
              symbol={depositSymbol}
              className="w-8 h-8 flex-shrink-0"
              imageUrl={depositIconUrl || `https://nowpayments.io/images/coins/${depositSymbol.toLowerCase()}.svg`}
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-xl font-bold text-white leading-snug">
                Send {depositAmount} {depositDisplayName || depositSymbol} to this address
              </h3>
              {!isExpired && (
                <p className="text-sm text-gray-400 mt-0.5 sm:mt-1">
                  Use the address below to complete your payment
                </p>
              )}
            </div>
          </div>
          
          <div className={`relative flex items-center gap-3 bg-white/5 rounded-xl p-4 border border-white/10 ${
            isExpired ? "border-red-500/30" : ""
          }`}>
            <code className={`flex-1 min-w-0 text-xs sm:text-base font-mono break-all ${
              isExpired ? "line-through text-gray-500" : "text-white"
            }`}>
              {depositAddress}
            </code>
            {!isExpired && (
              <button
                onClick={() => copyToClipboard(depositAddress, "address")}
                className="relative flex-shrink-0 p-2.5 rounded-lg transition-colors text-gray-400 hover:text-blue-500 hover:bg-white/5"
                title="Copy Address"
              >
                {copiedAddress ? (
                  <>
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-white rounded shadow-lg whitespace-nowrap z-10">Copied!</span>
                  </>
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {isExpired ? (
          <div className="p-4 sm:p-6 bg-red-500/10 border border-red-500/30 rounded-xl space-y-4">
            <div className="text-sm font-semibold text-red-400">Order Expired. The payment window has closed.</div>
            <a
              href="/"
              className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-[#2563eb] hover:bg-[#3b82f6] text-white font-semibold rounded-xl transition-colors high-contrast"
            >
              Back to Home
            </a>
            <p className="text-xs text-slate-500">
              If you have already sent funds, please contact support with your Order ID: <span className="font-mono text-slate-400">{orderId}</span>
            </p>
          </div>
        ) : (
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <div className="text-sm text-gray-400 leading-relaxed">
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

