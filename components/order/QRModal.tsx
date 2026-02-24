"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check } from "lucide-react";
import CryptoIcon from "@/components/CryptoIcon";

const QR_SIZE = 168;

interface QRModalProps {
  open: boolean;
  onClose: () => void;
  address: string;
  amount: string;
  symbol: string;
  /** NOWPayments-style icon URL (e.g. usdttrc20.svg) so logo matches selector */
  imageUrl?: string;
}

export default function QRModal({ open, onClose, address, amount, symbol, imageUrl }: QRModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      if ("vibrate" in navigator) navigator.vibrate(10);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const truncatedAddress = address.length > 20 
    ? `${address.slice(0, 12)}...${address.slice(-6)}`
    : address;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11, 14, 20, 0.8)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="rounded-3xl border border-white/10 bg-[#12161F] w-full max-w-[352px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 
            className="text-lg font-bold text-white"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Scan QR Code
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1A1F2B] flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          <div className="w-[200px] h-[200px] rounded-2xl bg-white p-4 flex items-center justify-center">
            <QRCodeSVG
              value={address}
              size={QR_SIZE}
              bgColor="#FFFFFF"
              fgColor="#000000"
              level="H"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Amount Info */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <span 
            className="text-[13px] font-medium"
            style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}
          >
            Send exactly
          </span>
          <div className="flex items-center gap-2">
            <CryptoIcon symbol={symbol} imageUrl={imageUrl} className="w-6 h-6 rounded-full" />
            <span 
              className="text-xl font-bold text-white"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {amount} {symbol}
            </span>
          </div>
        </div>

        {/* Address Section */}
        <div className="flex flex-col gap-2">
          <span 
            className="text-xs font-medium"
            style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}
          >
            To this address
          </span>
          <div 
            className="flex items-center justify-between gap-2 p-3.5 rounded-xl bg-[#0B0E14]"
            style={{ border: '1px solid #1E2533' }}
          >
            <code 
              className="text-xs font-medium text-white truncate"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {truncatedAddress}
            </code>
            <button
              type="button"
              onClick={copyAddress}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                copied 
                  ? "bg-[#22C55E] text-white" 
                  : "bg-[#2563EB] hover:bg-[#3B82F6] text-white"
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
