"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function getQRWithAmount(address: string, amount: string, symbol: string): string {
  if (!address) return "";
  const s = symbol.toLowerCase();
  if (s === "btc" || s === "ltc") return `${s}:${address}?amount=${amount}`;
  if (s === "eth") return `ethereum:${address}?value=${amount}`;
  return `${s}:${address}?amount=${amount}`;
}

const CARD_CLASS =
  "rounded-lg border border-white/5 bg-[#12161f] p-6 md:p-8 min-h-0 flex flex-col h-full";

interface OrderQRCardProps {
  orderId?: string;
  address: string;
  amount: string;
  symbol: string;
  isExpired: boolean;
}

export default function OrderQRCard({
  address,
  amount,
  symbol,
  isExpired,
}: OrderQRCardProps) {
  const [qrSize, setQrSize] = useState(200);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => {
      const mobile = typeof window !== "undefined" && window.innerWidth < 1024;
      setIsMobile(mobile);
      setQrSize(mobile ? 240 : 200);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const qrValue = getQRWithAmount(address, amount, symbol);
  const hasQR = !!address && !!qrValue;

  return (
    <div
      className={`${CARD_CLASS} relative overflow-hidden ${isExpired ? "grayscale backdrop-blur-sm" : ""}`}
    >
      <AnimatePresence mode="wait">
        {isExpired ? (
          <motion.div
            key="expired"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6 md:p-8 z-10 gap-3"
          >
            <motion.div
              animate={{ x: [0, -4, 4, -2, 2, 0] }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="w-20 h-20 rounded-full bg-slate-500/20 border border-slate-500/40 flex items-center justify-center shrink-0"
            >
              <Clock className="w-10 h-10 text-slate-400" />
            </motion.div>
            <span className="text-slate-300 text-sm font-medium shrink-0">Payment window closed</span>
          </motion.div>
        ) : hasQR ? (
          <motion.div
            key="qr"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col items-center justify-center w-full min-h-0"
          >
            <div
              className="rounded-3xl p-4 bg-white flex items-center justify-center shadow-inner w-64 h-64 lg:w-auto lg:h-auto"
              style={!isMobile ? { width: qrSize + 32, height: qrSize + 32 } : undefined}
            >
              <QRCodeSVG value={qrValue} size={qrSize} level="M" includeMargin={false} />
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="rounded-3xl bg-white/5 w-64 h-64 flex items-center justify-center text-slate-500 text-sm">
              No QR available
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
