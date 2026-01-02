"use client";

import { useState, useEffect, useRef } from "react";
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
  BTC: "37746251", // Verified from user example
  ETH: "37746838",
  USDT: "37746384",
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
};

// Extract width and height from className if present (e.g., "w-6 h-6" = 24px)
function getSize(className: string): number {
  const match = className.match(/w-(\d+)/);
  if (match) {
    const size = parseInt(match[1]);
    return size * 4; // Tailwind: w-6 = 24px (6 * 4)
  }
  return 24; // Default 24px
}

export default function CryptoIcon({ symbol, image, imageUrl, className = "w-6 h-6" }: CryptoIconProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement | null>(null);
  
  // Reset error state when image changes
  useEffect(() => {
    setError(false);
    setLoading(true);
    
    // Check if image is already loaded (cached images)
    if (imgRef.current && imgRef.current.complete) {
      setLoading(false);
    }
  }, [image, imageUrl, symbol]);
  
  const upperSymbol = symbol.toUpperCase();
  const lowerSymbol = symbol.toLowerCase();
  
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/CryptoIcon.tsx:render',message:'CryptoIcon render',data:{symbol,upperSymbol,lowerSymbol,hasImageUrl:!!imageUrl,imageUrl,hasImage:!!image,image,hasImageId:!!cryptocompareImageIds[upperSymbol]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,D'})}).catch(()=>{});
  // #endregion
  
  // Priority 1: Use imageUrl (NOWPayments hosted SVG) if provided
  // Priority 2: Use provided image (from JSON, local path)
  // Priority 3: Try local PNG from /coins/{symbol}.png
  // Priority 4: Fallback to CryptoCompare CDN
  const nowPaymentsImageUrl = imageUrl || (image && image.startsWith('http') ? image : null);
  const localImagePath = image && !image.startsWith('http') ? image : `/coins/${lowerSymbol}.png`;
  const imageId = cryptocompareImageIds[upperSymbol];
  const logoUrl = imageId 
    ? `https://www.cryptocompare.com/media/${imageId}/${lowerSymbol}.png`
    : null;
  
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/CryptoIcon.tsx:iconResolution',message:'Icon resolution paths',data:{nowPaymentsImageUrl,localImagePath,logoUrl,willUseNowPayments:!!nowPaymentsImageUrl,willUseLocal:!nowPaymentsImageUrl&&localImagePath,willUseCryptoCompare:!nowPaymentsImageUrl&&!localImagePath&&logoUrl,willUseFallback:!nowPaymentsImageUrl&&!localImagePath&&!logoUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

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
    };
    const color = colors[upperSymbol] || "#666";

    return (
      <div className={`${className} rounded-full flex items-center justify-center`} style={{ backgroundColor: color }}>
        <span className="text-white text-[10px] font-bold">{symbol.slice(0, 2)}</span>
      </div>
    );
  };

  const size = getSize(className);

  const colors: Record<string, string> = {
    BTC: "#f7931a",
    ETH: "#627eea",
    USDT: "#26a17b",
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
  };
  const color = colors[upperSymbol] || "#666";

  // Priority 1: Use NOWPayments hosted image URL (SVG)
  if (nowPaymentsImageUrl && !error) {
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
            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/CryptoIcon.tsx:onError',message:'Image load error',data:{symbol,imageUrl:nowPaymentsImageUrl,source:'nowPayments'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            setError(true);
            setLoading(false);
          }}
          onLoad={() => {
            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/CryptoIcon.tsx:onLoad',message:'Image loaded successfully',data:{symbol,imageUrl:nowPaymentsImageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            setLoading(false);
          }}
          loading="eager"
        />
      </div>
    );
  }

  // Priority 2: Use local image path (from JSON or default)
  if (localImagePath && !imageUrl && !error) {
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
            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/CryptoIcon.tsx:onError',message:'Image load error',data:{symbol,imageUrl:nowPaymentsImageUrl,source:'nowPayments'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            setError(true);
            setLoading(false);
          }}
          onLoad={() => setLoading(false)}
          loading="lazy"
        />
      </div>
    );
  }

  // Priority 3: Fallback to CryptoCompare CDN if local image failed
  if (logoUrl && !error) {
    return (
      <div className={`${className} rounded-full flex items-center justify-center overflow-hidden relative`} style={{ backgroundColor: color + '20' }}>
        {loading && (
          <div className={`absolute inset-0 rounded-full bg-neutral-800 animate-pulse`} style={{ backgroundColor: color + '20' }} />
        )}
        <img
          src={logoUrl}
          alt={symbol}
          className={`object-contain w-full h-full ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
          onError={() => {
            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/CryptoIcon.tsx:onError',message:'Image load error',data:{symbol,imageUrl:nowPaymentsImageUrl,source:'nowPayments'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            setError(true);
            setLoading(false);
          }}
          onLoad={() => setLoading(false)}
          loading="lazy"
        />
      </div>
    );
  }

  // Priority 4: Fallback icon
  return <FallbackIcon className={className} />;
}
