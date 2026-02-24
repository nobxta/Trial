"use client";

import { useState, useCallback } from "react";
import { Copy, Check, QrCode, Clock, ExternalLink, Info, Wallet, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ORDER_STATE_TEXT,
  getOrderStateKey,
  type OrderStateKey,
} from "@/lib/order-page-text";
import { orderPageText } from "@/lib/order-page-text";
import { getExplorerTxUrl } from "@/lib/explorer-url";

interface DepositAddressCardProps {
  depositAddress: string;
  amount: string;
  symbol: string;
  internalStatus: string | null;
  isExpired: boolean;
  onCopy?: () => void;
  onViewQr?: () => void;
  payoutTxHash?: string | null;
  outcomeNetwork?: string | null;
  receivedAmount?: string;
  receivedSymbol?: string;
  receiveAddress?: string | null;
  receiveSymbol?: string;
}

export default function DepositAddressCard({
  depositAddress,
  amount,
  symbol,
  internalStatus,
  isExpired,
  onCopy,
  onViewQr,
  payoutTxHash,
  outcomeNetwork,
  receivedAmount,
  receivedSymbol,
  receiveAddress,
  receiveSymbol,
}: DepositAddressCardProps) {
  const [copied, setCopied] = useState(false);

  const stateKey: OrderStateKey = isExpired ? "STATE_EXPIRED" : getOrderStateKey(internalStatus);
  const stateText = ORDER_STATE_TEXT[stateKey];

  const copyDeposit = useCallback(async () => {
    if (isExpired || !depositAddress) return;
    try {
      await navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      onCopy?.();
      if ("vibrate" in navigator) navigator.vibrate(10);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }, [depositAddress, isExpired, onCopy]);

  const title = stateText.title
    .replace("{amount}", amount)
    .replace("{currency}", symbol)
    .replace("{symbol}", symbol);

  // Expired State
  if (isExpired) {
    return (
      <div className="rounded-[20px] border border-white/10 bg-[#12161F] p-6 flex flex-col h-full shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
        <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '2px solid #EF4444' }}
          >
            <Clock className="w-8 h-8 text-[#EF4444]" />
          </div>
          <h2 
            className="text-xl font-bold mb-2"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#EF4444' }}
          >
            {title}
          </h2>
          {stateText.notice && (
            <p 
              className="text-sm mb-6"
              style={{ fontFamily: 'Inter, sans-serif', color: '#94A3B8' }}
            >
              {stateText.notice}
            </p>
          )}
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#2563EB] hover:bg-[#3B82F6] text-white font-semibold rounded-xl transition-colors"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {orderPageText.generic.backToHome}
          </a>
        </div>
      </div>
    );
  }

  const showAddressBlock = stateKey === "STATE_AWAITING_DEPOSIT" && depositAddress;
  const showViewQr = stateKey === "STATE_AWAITING_DEPOSIT" && depositAddress;

  return (
    <div className="rounded-[20px] border border-white/10 bg-[#12161F] p-6 flex flex-col h-full shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 
          className="text-white font-bold text-base"
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          Deposit Address
        </h3>
        {showViewQr && (
          <button
            type="button"
            onClick={onViewQr}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1A1F2B] text-[#94A3B8] hover:text-white transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span 
              className="text-xs font-medium"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              QR Code
            </span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {stateKey === "STATE_COMPLETED" ? (
          <motion.div
            key="completed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-5 flex-1"
          >
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
                >
                  <Check className="w-5 h-5 text-[#22C55E]" />
                </div>
                <div>
                  {stateText.bodyTemplate && receivedAmount && receivedSymbol && (
                    <p 
                      className="font-semibold text-sm text-white"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {stateText.bodyTemplate
                        .replace("{amount}", receivedAmount)
                        .replace("{symbol}", receivedSymbol)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {stateText.ctaLabel && payoutTxHash && (
              <a
                href={getExplorerTxUrl(outcomeNetwork ?? null, payoutTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-white font-semibold transition-colors"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {stateText.ctaLabel}
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="deposit"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-5 flex-1"
          >
            {/* Instruction Banner - Awaiting Deposit */}
            {showAddressBlock && (
              <div 
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ 
                  background: 'linear-gradient(180deg, rgba(37, 99, 235, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
                  border: '1px solid rgba(37, 99, 235, 0.2)'
                }}
              >
                <div 
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(37, 99, 235, 0.2)' }}
                >
                  <Info className="w-[18px] h-[18px] text-[#2563EB]" />
                </div>
                <div className="flex flex-col gap-1">
                  <span 
                    className="text-sm font-semibold text-white"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Send exactly {amount} {symbol}
                  </span>
                  <span 
                    className="text-xs"
                    style={{ fontFamily: 'Inter, sans-serif', color: '#94A3B8' }}
                  >
                    to the address below to complete your exchange
                  </span>
                </div>
              </div>
            )}

            {/* Confirming State Banner */}
            {stateKey === "STATE_CONFIRMING" && (
              <div 
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ 
                  background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}
              >
                <div 
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
                >
                  <Loader2 className="w-[18px] h-[18px] text-[#3B82F6] animate-spin" />
                </div>
                <div className="flex flex-col gap-1">
                  <span 
                    className="text-sm font-semibold text-white"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Confirming your payment
                  </span>
                  <span 
                    className="text-xs"
                    style={{ fontFamily: 'Inter, sans-serif', color: '#94A3B8' }}
                  >
                    {stateText.notice}
                  </span>
                </div>
              </div>
            )}

            {/* Exchanging State Banner */}
            {stateKey === "STATE_EXCHANGING" && (
              <div 
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ 
                  background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.2)'
                }}
              >
                <div 
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
                >
                  <Loader2 className="w-[18px] h-[18px] text-[#F59E0B] animate-spin" />
                </div>
                <div className="flex flex-col gap-1">
                  <span 
                    className="text-sm font-semibold text-white"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Processing your exchange
                  </span>
                  <span 
                    className="text-xs"
                    style={{ fontFamily: 'Inter, sans-serif', color: '#94A3B8' }}
                  >
                    {stateText.notice}
                  </span>
                </div>
              </div>
            )}

            {/* Address Section */}
            {showAddressBlock && (
              <div className="flex flex-col gap-3">
                <span 
                  className="text-xs font-medium"
                  style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}
                >
                  {symbol} Deposit Address
                </span>
                <div 
                  className="flex items-center justify-between gap-3 p-4 rounded-xl bg-[#0B0E14]"
                  style={{ border: '1px solid #1E2533' }}
                >
                  <code 
                    className="text-[13px] font-medium text-white break-all"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {depositAddress}
                  </code>
                  <button
                    type="button"
                    onClick={copyDeposit}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs transition-colors ${
                      copied 
                        ? "bg-[#22C55E] text-white" 
                        : "bg-[#2563EB] hover:bg-[#3B82F6] text-white"
                    }`}
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            {/* Receiving Address Section */}
            {receiveAddress && receiveSymbol && (
              <div className="flex flex-col gap-3">
                <span 
                  className="text-xs font-medium"
                  style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}
                >
                  Your {receiveSymbol} Receiving Address
                </span>
                <div 
                  className="flex items-center gap-3 p-3.5 px-4 rounded-xl bg-[#1A1F2B]"
                  style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
                >
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'rgba(98, 126, 234, 0.2)' }}
                  >
                    <Wallet className="w-3.5 h-3.5 text-[#627EEA]" />
                  </div>
                  <code 
                    className="text-xs break-all"
                    style={{ fontFamily: 'JetBrains Mono, monospace', color: '#94A3B8' }}
                  >
                    {receiveAddress}
                  </code>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
