"use client";

import { useState, useEffect } from "react";
import AddressBar from "@/components/AddressBar";
import { QRCodeSVG } from "qrcode.react";

/** Builds payment URI for wallet scan (e.g. btc:address?amount=0.001) */
function getQRContent(address: string, amount: string, symbol: string): string {
  if (!address) return "";
  const s = symbol.toLowerCase();
  if (s === "btc" || s === "ltc") return `${s}:${address}?amount=${amount}`;
  if (s === "eth") return `ethereum:${address}?value=${amount}`;
  return `${s}:${address}?amount=${amount}`;
}

interface DepositAddressWithQRProps {
  address: string;
  amount: string;
  symbol: string;
  isExpired: boolean;
  instructionText: React.ReactNode;
}

export default function DepositAddressWithQR({
  address,
  amount,
  symbol,
  isExpired,
  instructionText,
}: DepositAddressWithQRProps) {
  const [view, setView] = useState<"address" | "qr">("address");
  const [qrSize, setQrSize] = useState(180);

  useEffect(() => {
    const update = () => setQrSize(window.innerWidth < 640 ? 160 : 200);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const qrContent = getQRContent(address, amount, symbol);
  const canShowQr = !!address && !!qrContent && !isExpired;

  return (
    <div className="rounded-2xl border border-white/5 border-slate-800/50 bg-[#1a1d23]/40 backdrop-blur-md p-4 sm:p-5 shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-card-enter space-y-3">
      {instructionText}

      {view === "address" && (
        <>
          <AddressBar address={address} isExpired={isExpired} />
          {canShowQr && (
            <button
              type="button"
              onClick={() => setView("qr")}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Show QR code
            </button>
          )}
        </>
      )}

      {view === "qr" && canShowQr && (
        <>
          <div className="flex flex-col items-center py-4">
            <div
              className="rounded-2xl p-4 bg-white flex items-center justify-center shadow-lg"
              style={{ width: qrSize + 32, height: qrSize + 32 }}
            >
              <QRCodeSVG value={qrContent} size={qrSize} level="M" includeMargin={false} />
            </div>
            <p className="text-slate-500 text-xs mt-3 text-center">
              Scan with your {symbol} wallet to pay {amount} {symbol}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setView("address")}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Show address
          </button>
        </>
      )}
    </div>
  );
}
