"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeSectionProps {
  address: string;
  amount: string;
  symbol: string;
  isExpired?: boolean;
}

export default function QRCodeSection({ address, amount, symbol, isExpired = false }: QRCodeSectionProps) {
  const [qrMode, setQrMode] = useState<"address" | "amount">("amount");
  const [qrSize, setQrSize] = useState(220);

  // Responsive QR code size
  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth < 640) {
        setQrSize(180);
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

  if (!address) {
    return (
      <div className="bg-gradient-to-br from-[#0f1115] to-[#141820] rounded-2xl border border-[#1e2329]/60 shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col items-center justify-center min-h-[200px] text-[#8b949e] text-sm">
          Address not available
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-[#0f1115] to-[#141820] rounded-2xl border shadow-lg p-4 sm:p-6 lg:p-8 ${
      isExpired ? 'border-[#dc2626]/30 opacity-60' : 'border-[#1e2329]/60'
    }`}>
      <div className="flex flex-col items-center">
        <div className={`bg-white p-3 sm:p-4 lg:p-5 rounded-xl mb-4 sm:mb-6 shadow-lg flex items-center justify-center ${
          isExpired ? 'opacity-50 grayscale' : ''
        }`}>
          <QRCodeSVG
            value={qrContent}
            size={qrSize}
            level="M"
            includeMargin={false}
          />
        </div>

        {!isExpired && (
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setQrMode("address")}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                qrMode === "address"
                  ? "bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20"
                  : "bg-[#1e2329] text-[#8b949e] hover:text-white hover:bg-[#2a2f36] border border-[#2a2f36]"
              }`}
            >
              Address
            </button>
            <button
              onClick={() => setQrMode("amount")}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                qrMode === "amount"
                  ? "bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20"
                  : "bg-[#1e2329] text-[#8b949e] hover:text-white hover:bg-[#2a2f36] border border-[#2a2f36]"
              }`}
            >
              With Amount
            </button>
          </div>
        )}
        
        {isExpired && (
          <div className="w-full p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="text-xs text-center text-red-400 font-medium">
              QR Code Disabled
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

