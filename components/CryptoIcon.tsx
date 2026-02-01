"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

interface CryptoIconProps {
  symbol: string;
  image?: string; // Can be imageUrl from SupportedCrypto or local path
  imageUrl?: string; // NOWPayments hosted image URL
  className?: string;
}

// Map symbols to CryptoCompare image IDs (static CDN, no API key required)
// Format: https://www.cryptocompare.com/media/{id}/{symbol}.png
// These IDs can be obtained once from CryptoCompare's coinList API and then hardcoded
// To get IDs: https://www.cryptocompare.com/api/data/coinlist (ImageUrl contains /media/{id}/)
const cryptocompareImageIds: Record<string, string> = {
  BTC: "37746251",
  ETH: "37746838",
  USDT: "37746384",
  USDC: "3408",
  BNB: "37746852",
  SOL: "41244034",
  LTC: "37746243",
  TON: "51502576",
  XRP: "37746339",
  ADA: "37746096",
  DOGE: "37746319",
  AVAX: "50653968",
  MATIC: "37746248",
  DOT: "37746245",
  LINK: "37746238",
  UNI: "37746838",
  ATOM: "3794",
  APT: "26455",
  ARB: "16547",
  BCH: "37746244",
  TRX: "37746839",
  XLM: "37746246",
  XMR: "37746247",
  ZEC: "37746249",
  DASH: "37746250",
  VET: "37746840",
  NEAR: "41244035",
  SUI: "41244036",
  INJ: "37746841",
  KAS: "37746842",
  LUNA: "37746843",
  ALGO: "37746097",
  '1INCH': "37746252",
  AAVE: "37746253",
  APE: "37746254",
  FLOKI: "37746255",
  GALA: "37746256",
  MANA: "37746257",
  PEPE: "37746258",
  SHIB: "37746259",
  TUSD: "37746260",
  PYUSD: "37746261",
  HMSTR: "37746262",
  NOT: "37746263",
  TRUMP: "37746264",
  BABYDOGE: "37746265",
};

// Extract width and height from className if present (e.g., "w-6 h-6" = 24px)
function getSize(className: string | undefined): number {
  if (!className) return 24;
  const match = className.match(/w-(\d+)/);
  if (match) {
    const size = parseInt(match[1]);
    return size * 4; // Tailwind: w-6 = 24px (6 * 4)
  }
  return 24; // Default 24px
}

export default function CryptoIcon({ symbol, image, imageUrl, className = "w-6 h-6" }: CryptoIconProps) {
  type Stage = "nowpayments" | "local" | "cryptocompare" | "spothq" | "fallback";
  const [stage, setStage] = useState<Stage>("fallback");
  const [loading, setLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const upperSymbol = symbol.toUpperCase();
  const lowerSymbol = symbol.toLowerCase();

  const nowPaymentsImageUrl = useMemo(() => {
    const url = imageUrl || (image && image.startsWith("http") ? image : null);
    return url || null;
  }, [image, imageUrl]);

  // Only use local image if explicitly provided via `image` prop (not default /coins/{symbol}.png)
  const localImagePath = useMemo(() => {
    const hasExplicitLocalImage = image && !image.startsWith("http") && !image.startsWith("/coins/");
    return hasExplicitLocalImage ? image! : null;
  }, [image]);

  const cryptoCompareUrl = useMemo(() => {
    const imageId = cryptocompareImageIds[upperSymbol];
    return imageId ? `https://www.cryptocompare.com/media/${imageId}/${lowerSymbol}.png` : null;
  }, [upperSymbol, lowerSymbol]);

  // Extra CDN fallback that works for many symbols without IDs.
  const spotHqUrl = useMemo(() => {
    return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${lowerSymbol}.png`;
  }, [lowerSymbol]);

  // Default fallback icon
  const DefaultFallbackIcon = ({ className }: { className?: string }) => {
    const fallbackSize = getSize(className);
    return (
      <Image
        src="/coins/default.svg"
        alt={symbol}
        width={fallbackSize}
        height={fallbackSize}
        className={className}
      />
    );
  };

  // Fallback SVG icon with brand colors
  const FallbackIcon = ({ className }: { className?: string }) => {
    const colors: Record<string, string> = {
      BTC: "#f7931a",
      ETH: "#627eea",
      USDT: "#26a17b",
      USDC: "#2775ca",
      BNB: "#f3ba2f",
      SOL: "#14f195",
      LTC: "#345d9d",
      TON: "#0088cc",
      XRP: "#0085c3",
      ADA: "#0033ad",
      DOGE: "#c2a633",
      AVAX: "#e84142",
      MATIC: "#8247e5",
      DOT: "#e6007a",
      LINK: "#375bd2",
      UNI: "#ff007a",
      ATOM: "#2e3148",
      APT: "#000000",
      ARB: "#28a0f0",
      BCH: "#0ac18e",
      TRX: "#ef0027",
      XLM: "#000000",
      XMR: "#ff6600",
      ZEC: "#f4b728",
      DASH: "#008ce7",
      VET: "#15bdff",
      NEAR: "#000000",
      SUI: "#6fbcf0",
      INJ: "#00b8ff",
      KAS: "#1975c0",
      LUNA: "#172852",
      ALGO: "#000000",
      '1INCH': "#000000",
      AAVE: "#b6509e",
      APE: "#0054f9",
      FLOKI: "#000000",
      GALA: "#000000",
      MANA: "#ff2d55",
      PEPE: "#3aaf4a",
      SHIB: "#ffa409",
      TUSD: "#000000",
      PYUSD: "#0070ba",
      HMSTR: "#000000",
      NOT: "#000000",
      TRUMP: "#000000",
      BABYDOGE: "#000000",
    };
    const color = colors[upperSymbol] || "#666";

    return (
      <div className={`${className} rounded-full flex items-center justify-center`} style={{ backgroundColor: color }}>
        <span className="text-white text-[10px] font-bold">{symbol.slice(0, 2)}</span>
      </div>
    );
  };

  const size = getSize(className);

  const color = useMemo(() => {
    const colors: Record<string, string> = {
      BTC: "#f7931a",
      ETH: "#627eea",
      USDT: "#26a17b",
      USDC: "#2775ca",
      BNB: "#f3ba2f",
      SOL: "#14f195",
      LTC: "#345d9d",
      TON: "#0088cc",
      XRP: "#0085c3",
      ADA: "#0033ad",
      DOGE: "#c2a633",
      AVAX: "#e84142",
      MATIC: "#8247e5",
      DOT: "#e6007a",
      LINK: "#375bd2",
      UNI: "#ff007a",
      ATOM: "#2e3148",
      APT: "#000000",
      ARB: "#28a0f0",
      BCH: "#0ac18e",
      TRX: "#ef0027",
      XLM: "#000000",
      XMR: "#ff6600",
      ZEC: "#f4b728",
      DASH: "#008ce7",
      VET: "#15bdff",
      NEAR: "#000000",
      SUI: "#6fbcf0",
      INJ: "#00b8ff",
      KAS: "#1975c0",
      LUNA: "#172852",
    };
    return colors[upperSymbol] || "#666";
  }, [upperSymbol]);

  const nextStage = (failed: Stage): Stage => {
    const order: Stage[] = ["nowpayments", "local", "cryptocompare", "spothq", "fallback"];
    const startIdx = order.indexOf(failed);
    for (let i = startIdx + 1; i < order.length; i++) {
      const candidate = order[i];
      if (candidate === "nowpayments" && nowPaymentsImageUrl) return candidate;
      if (candidate === "local" && localImagePath) return candidate;
      if (candidate === "cryptocompare" && cryptoCompareUrl) return candidate;
      if (candidate === "spothq" && spotHqUrl) return candidate;
      if (candidate === "fallback") return "fallback";
    }
    return "fallback";
  };

  // Reset stage when inputs change
  useEffect(() => {
    setLoading(true);
    if (nowPaymentsImageUrl) setStage("nowpayments");
    else if (localImagePath) setStage("local");
    else if (cryptoCompareUrl) setStage("cryptocompare");
    else setStage("spothq");

    // Cached images
    if (imgRef.current && imgRef.current.complete) {
      setLoading(false);
    }
  }, [nowPaymentsImageUrl, localImagePath, cryptoCompareUrl, spotHqUrl, symbol]);

  if (stage === "nowpayments" && nowPaymentsImageUrl) {
    return (
      <div className={`${className} rounded-full flex items-center justify-center overflow-hidden bg-neutral-800 relative`} style={{ backgroundColor: color + '20' }}>
        {loading && (
          <div className={`absolute inset-0 rounded-full bg-neutral-800 animate-pulse`} style={{ backgroundColor: color + '20' }} />
        )}
        <img
          ref={imgRef}
          src={nowPaymentsImageUrl}
          alt={symbol}
          className={`object-contain w-full h-full ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
          onError={() => {
            setStage(nextStage("nowpayments"));
            setLoading(false);
          }}
          onLoad={() => {
            setLoading(false);
          }}
          loading="eager"
        />
      </div>
    );
  }

  if (stage === "local" && localImagePath && !imageUrl) {
    return (
      <div className={`${className} rounded-full flex items-center justify-center overflow-hidden bg-neutral-800 relative`} style={{ backgroundColor: color + '20' }}>
        {loading && (
          <div className={`absolute inset-0 rounded-full bg-neutral-800 animate-pulse`} style={{ backgroundColor: color + '20' }} />
        )}
        <Image
          src={localImagePath}
          alt={symbol}
          width={size}
          height={size}
          className={`object-cover ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
          onError={() => {
            setStage(nextStage("local"));
            setLoading(false);
          }}
          onLoad={() => {
            setLoading(false);
          }}
          loading="lazy"
        />
      </div>
    );
  }

  if (stage === "cryptocompare" && cryptoCompareUrl) {
    return (
      <div className={`${className} rounded-full flex items-center justify-center overflow-hidden relative`} style={{ backgroundColor: color + '20' }}>
        {loading && (
          <div className={`absolute inset-0 rounded-full bg-neutral-800 animate-pulse`} style={{ backgroundColor: color + '20' }} />
        )}
        <img
          ref={imgRef}
          src={cryptoCompareUrl}
          alt={symbol}
          className={`object-contain w-full h-full ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
          onError={() => {
            setStage(nextStage("cryptocompare"));
            setLoading(false);
          }}
          onLoad={() => {
            setLoading(false);
          }}
          loading="lazy"
        />
      </div>
    );
  }

  if (stage === "spothq") {
    return (
      <div className={`${className} rounded-full flex items-center justify-center overflow-hidden relative`} style={{ backgroundColor: color + "20" }}>
        {loading && (
          <div className={`absolute inset-0 rounded-full bg-neutral-800 animate-pulse`} style={{ backgroundColor: color + "20" }} />
        )}
        <img
          ref={imgRef}
          src={spotHqUrl}
          alt={symbol}
          className={`object-contain w-full h-full ${loading ? "opacity-0" : "opacity-100"} transition-opacity duration-200`}
          onError={() => {
            setStage("fallback");
            setLoading(false);
          }}
          onLoad={() => {
            setLoading(false);
          }}
          loading="lazy"
        />
      </div>
    );
  }

  // Final fallback
  return <FallbackIcon className={className} />;
}
