"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CARD_CLASS =
  "rounded-lg border border-white/5 bg-[#12161f] p-6 md:p-8 min-h-0 min-w-0 flex flex-col h-full w-full transition-shadow duration-200 hover:shadow-[0_0_32px_rgba(59,130,246,0.12)]";

interface HeroInstructionCardProps {
  orderId?: string;
  sendAmount: string;
  sendSymbol: string;
  depositAddress: string;
  receiveSymbol: string;
  receiveAddress: string | null;
  isExpired: boolean;
  onCopy?: () => void;
}

const TRUNCATE_LEN = 20;

export default function HeroInstructionCard({
  orderId,
  sendAmount,
  sendSymbol,
  depositAddress,
  receiveSymbol,
  receiveAddress,
  isExpired,
  onCopy,
}: HeroInstructionCardProps) {
  const [copied, setCopied] = useState(false);
  const [depositExpanded, setDepositExpanded] = useState(false);
  const [receiveExpanded, setReceiveExpanded] = useState(false);

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

  const depositLong = depositAddress.length > TRUNCATE_LEN * 2;
  const receiveLong = receiveAddress ? receiveAddress.length > TRUNCATE_LEN * 2 : false;

  return (
    <div
      className={`${CARD_CLASS} relative ${isExpired ? "grayscale backdrop-blur-sm pointer-events-none min-h-[260px] overflow-auto" : "overflow-hidden"}`}
    >
      <AnimatePresence mode="wait">
        {isExpired ? (
          <motion.div
            key="expired"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-10 pointer-events-auto flex flex-col items-center justify-center p-6 md:p-8 text-center overflow-y-auto overflow-x-hidden bg-[#12161f] rounded-lg"
          >
            <div className="flex flex-col items-center gap-4 w-full min-w-0 flex-shrink-0 max-w-full">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.25 }}
                className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0"
              >
                <Clock className="w-8 h-8 text-red-400" />
              </motion.div>
              <p className="text-base sm:text-lg font-semibold text-red-400 break-words w-full min-w-0 px-2 leading-snug">
                Order Expired. The payment window has closed.
              </p>
              <a
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#2563eb] hover:bg-[#3b82f6] text-white font-semibold rounded-xl transition-colors shrink-0"
              >
                Back to Home
              </a>
              {orderId && (
                <p className="text-xs text-slate-500 mt-2 break-words w-full min-w-0 px-2 text-center">
                  If you have already sent funds, please contact support with your Order ID:{" "}
                  <span className="font-mono text-slate-400">{orderId}</span>
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full text-center md:text-left items-center md:items-stretch"
          >
            <p className="text-white text-lg sm:text-xl mb-4 w-full">
              Send <span className="font-bold text-xl sm:text-2xl">{sendAmount} {sendSymbol}</span> to the address:
            </p>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full min-w-0 my-6 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <code
                className="font-mono text-xs text-white min-w-0 flex-1 break-all"
                title={depositAddress}
              >
                {depositLong && !depositExpanded
                  ? `${depositAddress.slice(0, TRUNCATE_LEN)}…${depositAddress.slice(-TRUNCATE_LEN)}`
                  : depositAddress}
              </code>
              <div className="flex items-center justify-center md:justify-end gap-2 shrink-0">
                {depositLong && (
                  <button
                    type="button"
                    onClick={() => setDepositExpanded((e) => !e)}
                    className="text-[11px] uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-0.5"
                  >
                    {depositExpanded ? "Show less" : "View full"}
                    {depositExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={copyDeposit}
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="Copy address"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-slate-500 text-[11px] uppercase tracking-wider mt-0">
              The exchange rate will be fixed after receiving 1 network confirmation.
            </p>
            {receiveAddress && (
              <div className="mt-5 pt-4 border-t border-white/5 w-full">
                <p className="text-slate-500 text-[11px] uppercase tracking-wider mb-1">Receiving address {receiveSymbol}</p>
                <code className="font-mono text-xs text-slate-400 block break-all min-w-0">
                  {receiveLong && !receiveExpanded
                    ? `${receiveAddress.slice(0, TRUNCATE_LEN)}…${receiveAddress.slice(-TRUNCATE_LEN)}`
                    : receiveAddress}
                </code>
                {receiveLong && (
                  <button
                    type="button"
                    onClick={() => setReceiveExpanded((e) => !e)}
                    className="text-[11px] uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-0.5 mt-1"
                  >
                    {receiveExpanded ? "Show less" : "View full"}
                    {receiveExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
