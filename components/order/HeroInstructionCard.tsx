"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

const CARD_CLASS =
  "rounded-xl border border-white/[0.06] bg-[#12161f] p-6 md:p-8 min-h-0 min-w-0 flex flex-col h-full w-full transition-shadow duration-200 shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:shadow-[0_0_32px_rgba(59,130,246,0.12)]";

function getQRWithAmount(address: string, amount: string, symbol: string): string {
  if (!address) return "";
  const s = symbol.toLowerCase();
  if (s === "btc" || s === "ltc") return `${s}:${address}?amount=${amount}`;
  if (s === "eth") return `ethereum:${address}?value=${amount}`;
  return `${s}:${address}?amount=${amount}`;
}

interface HeroInstructionCardProps {
  orderId?: string;
  sendAmount: string;
  sendSymbol: string;
  depositAddress: string;
  receiveSymbol: string;
  receiveAddress: string | null;
  isExpired: boolean;
  onCopy?: () => void;
  /** When set, show a small QR next to the address on mobile only */
  qrAmount?: string;
  qrSymbol?: string;
}

/** Only show "View full" when address is actually too long for the card. */
const TRUNCATE_THRESHOLD = 44;
const TRUNCATE_END_LEN = 12;
const MOBILE_QR_SIZE = 64;

export default function HeroInstructionCard({
  orderId,
  sendAmount,
  sendSymbol,
  depositAddress,
  receiveSymbol,
  receiveAddress,
  isExpired,
  onCopy,
  qrAmount,
  qrSymbol,
}: HeroInstructionCardProps) {
  const [copied, setCopied] = useState(false);
  const [depositExpanded, setDepositExpanded] = useState(false);
  const [receiveExpanded, setReceiveExpanded] = useState(false);

  const qrValue = qrAmount != null && qrSymbol != null ? getQRWithAmount(depositAddress, qrAmount, qrSymbol) : "";
  const showMobileQR = !isExpired && !!qrValue && depositAddress.length > 0;

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

  const depositLong = depositAddress.length > TRUNCATE_THRESHOLD;
  const receiveLong = receiveAddress ? receiveAddress.length > TRUNCATE_THRESHOLD : false;

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
            className="absolute inset-0 z-10 pointer-events-auto flex flex-col items-center justify-center p-6 md:p-8 text-center overflow-y-auto overflow-x-hidden bg-[#12161f] rounded-xl"
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
            <p className="text-slate-300 text-base sm:text-lg mb-1 w-full leading-relaxed">
              Send <span className="font-bold text-white text-xl sm:text-2xl tracking-tight">{sendAmount} {sendSymbol}</span> to the address below:
            </p>
            <div className="flex flex-row items-stretch gap-3 w-full min-w-0 my-5 rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row flex-1 min-w-0 gap-2 sm:gap-3">
                <code
                  className="font-mono text-[11px] sm:text-sm text-slate-100 min-w-0 flex-1 break-all leading-relaxed select-all"
                  title={depositAddress}
                >
                  {depositLong && !depositExpanded
                    ? `${depositAddress.slice(0, TRUNCATE_THRESHOLD - TRUNCATE_END_LEN)}…${depositAddress.slice(-TRUNCATE_END_LEN)}`
                    : depositAddress}
                </code>
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                  {depositLong && (
                    <button
                      type="button"
                      onClick={() => setDepositExpanded((e) => !e)}
                      className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {depositExpanded ? "Show less" : "View full"}
                      {depositExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={copyDeposit}
                    className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    aria-label="Copy address"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {showMobileQR && (
                <div className="flex lg:hidden shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                  <QRCodeSVG value={qrValue} size={MOBILE_QR_SIZE} level="M" includeMargin={false} />
                </div>
              )}
            </div>
            <p className="text-slate-500 text-[10px] sm:text-xs font-medium uppercase tracking-[0.1em] mt-0">
              The exchange rate will be fixed after receiving 1 network confirmation.
            </p>
            {receiveAddress && (
              <div className="mt-6 pt-5 border-t border-white/[0.06] w-full min-w-0">
                <p className="text-slate-400 text-[10px] sm:text-xs font-medium uppercase tracking-[0.1em] mb-2">Receiving address {receiveSymbol}</p>
                <code className="font-mono text-[11px] sm:text-sm text-slate-400 block break-all min-w-0 leading-relaxed select-all" title={receiveAddress}>
                  {receiveLong && !receiveExpanded
                    ? `${receiveAddress.slice(0, TRUNCATE_THRESHOLD - TRUNCATE_END_LEN)}…${receiveAddress.slice(-TRUNCATE_END_LEN)}`
                    : receiveAddress}
                </code>
                {receiveLong && (
                  <button
                    type="button"
                    onClick={() => setReceiveExpanded((e) => !e)}
                    className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-1 mt-1.5"
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
