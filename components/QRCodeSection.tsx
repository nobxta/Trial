"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeSectionProps {
  address: string;
  amount: string;
  symbol: string;
  isExpired?: boolean;
  /** On mobile: show only centered QR with white p-3 rounded background */
  compactMobile?: boolean;
}

export default function QRCodeSection({ address, amount, symbol, isExpired = false, compactMobile = false }: QRCodeSectionProps) {
  const [qrMode, setQrMode] = useState<"address" | "amount">("amount");
  const [qrSize, setQrSize] = useState(160);

  // Responsive QR code size (smaller on mobile so card doesn’t dominate)
  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth < 380) {
        setQrSize(140);
      } else if (window.innerWidth < 640) {
        setQrSize(160);
      } else if (window.innerWidth < 1024) {
        setQrSize(200);
      } else {
        setQrSize(220);
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Generate QR code content based on mode
  // For crypto URI scheme: bitcoin:address?amount=0.01 or ethereum:address?value=0.01
  const getQRContent = () => {
    if (!address) return '';
    
    if (qrMode === "address") {
      return address;
    }
    
    // Generate crypto URI with amount
    const cryptoPrefix = symbol.toLowerCase();
    // Use appropriate format based on currency
    if (cryptoPrefix === "btc" || cryptoPrefix === "ltc") {
      return `${cryptoPrefix}:${address}?amount=${amount}`;
    } else if (cryptoPrefix === "eth") {
      // Ethereum uses value instead of amount
      return `ethereum:${address}?value=${amount}`;
    } else {
      // For other currencies, use generic format
      return `${cryptoPrefix}:${address}?amount=${amount}`;
    }
  };

  const qrContent = getQRContent();

  const cardClass = "bg-[#1a1d23]/60 backdrop-blur-xl border border-white/[0.05] rounded-2xl shadow-2xl shadow-black/20";

  if (!address) {
    return (
      <div className={`${cardClass} p-4 sm:p-6 lg:p-8`}>
        <div className="flex flex-col items-center justify-center min-h-[140px] sm:min-h-[200px] text-gray-400 text-xs sm:text-sm">
          Address not available
        </div>
      </div>
    );
  }

  if (compactMobile) {
    return (
      <div className="flex flex-col items-center">
        <div className={`bg-white p-3 rounded-xl flex items-center justify-center shadow-lg ${isExpired ? "opacity-50 grayscale" : ""}`}>
          <QRCodeSVG value={qrContent} size={Math.min(qrSize, 180)} level="M" includeMargin={false} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${cardClass} p-4 sm:p-6 lg:p-8 flex flex-col h-full ${isExpired ? "border-red-500/30 opacity-60" : ""}`}>
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <div className={`bg-white p-3 sm:p-4 lg:p-5 rounded-xl shadow-lg flex items-center justify-center ${isExpired ? "opacity-50 grayscale" : ""}`}>
          <QRCodeSVG value={qrContent} size={qrSize} level="M" includeMargin={false} />
        </div>
      </div>

      {!isExpired && (
        <div className="flex gap-2 w-full mt-auto pt-4">
          <button
            onClick={() => setQrMode("address")}
            className={`flex-1 py-2.5 sm:py-3 px-4 rounded-lg font-medium text-sm transition-all ${
              qrMode === "address"
                ? "bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20"
                : "bg-[#1e2329] text-gray-400 hover:text-white hover:bg-[#2a2f36] border border-white/[0.05]"
            }`}
          >
            Address
          </button>
          <button
            onClick={() => setQrMode("amount")}
            className={`flex-1 py-2.5 sm:py-3 px-4 rounded-lg font-medium text-sm transition-all ${
              qrMode === "amount"
                ? "bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20"
                : "bg-[#1e2329] text-gray-400 hover:text-white hover:bg-[#2a2f36] border border-white/[0.05]"
            }`}
          >
            With Amount
          </button>
        </div>
      )}
      {isExpired && (
        <div className="w-full p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-center text-xs text-red-400 font-medium mt-auto">
          QR Code Disabled
        </div>
      )}
    </div>
  );
}

