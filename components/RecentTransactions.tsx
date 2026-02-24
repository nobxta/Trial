"use client";

import { useEffect, useState } from "react";
import CryptoIcon from "./CryptoIcon";
import { getCryptosBySymbol } from "@/lib/supported-cryptos";
import { ArrowRight } from "lucide-react";

interface Transaction {
  id: string;
  timestamp: number; // Order creation time (Unix timestamp in milliseconds)
  completedAt: number; // Swap completion time (Unix timestamp in milliseconds)
  fromAmount: string;
  fromSymbol: string;
  fromImageUrl?: string;
  toAmount: string;
  toSymbol: string;
  toImageUrl?: string;
}

// Helper to get first enabled crypto by symbol with imageUrl
const getCryptoImageUrl = (symbol: string): string | undefined => {
  const cryptos = getCryptosBySymbol(symbol);
  const enabledCrypto = cryptos.find(c => c.enabled);
  return enabledCrypto?.imageUrl;
};

const MAX_VISIBLE = 7;

// Top cryptos only: BTC, ETH, SOL, BNB (BSC), LTC, USDC, USDT + a couple more for variety
const TOP_CRYPTOS = ["BTC", "ETH", "SOL", "BNB", "LTC", "USDT", "USDC", "DOGE", "XRP"] as const;

// Realistic crypto prices (approximate)
const cryptoPrices: Record<string, number> = {
  BTC: 97500,
  ETH: 3650,
  USDT: 1,
  USDC: 1,
  BNB: 615,
  SOL: 225,
  LTC: 98,
  DOGE: 0.38,
  XRP: 2.1,
};

// Sensible max per symbol so amounts look real (no 2 BTC swaps)
const maxAmountBySymbol: Record<string, number> = {
  BTC: 0.08,
  ETH: 1.5,
  USDT: 50000,
  USDC: 50000,
  BNB: 15,
  SOL: 80,
  LTC: 80,
  DOGE: 25000,
  XRP: 8000,
};

// All pairs from top cryptos only (from !== to)
const TOP_PAIRS: { from: string; to: string }[] = (() => {
  const pairs: { from: string; to: string }[] = [];
  for (const from of TOP_CRYPTOS) {
    for (const to of TOP_CRYPTOS) {
      if (from !== to) pairs.push({ from, to });
    }
  }
  return pairs;
})();

// Generate realistic transaction amount (capped per symbol for main/side crypto)
const generateRandomAmount = (symbol: string, targetUSDValue: number): string => {
  const price = cryptoPrices[symbol] || 1;
  let amount = targetUSDValue / price;
  const maxAmount = maxAmountBySymbol[symbol];
  if (maxAmount != null && amount > maxAmount) {
    amount = maxAmount;
  }
  
  // Ensure minimum amount to avoid zeros
  if (amount <= 0 || isNaN(amount) || !isFinite(amount)) {
    return '0.01';
  }
  
  // Format based on amount size for realism, remove trailing zeros
  let formatted: string;
  if (amount < 0.00001) {
    formatted = amount.toFixed(8);
  } else if (amount < 0.01) {
    formatted = amount.toFixed(6);
  } else if (amount < 1) {
    formatted = amount.toFixed(4);
  } else if (amount < 100) {
    formatted = amount.toFixed(2);
  } else {
    formatted = Math.round(amount).toLocaleString();
  }
  
  // Remove trailing zeros and unnecessary decimal point
  return formatted.replace(/\.?0+$/, '');
};

// Realistic USD value: mostly under $1k, sometimes $5k, occasionally more (not crazy so it doesn't look fake)
const generateRandomUSDValue = (rng: () => number): number => {
  const rand = rng();
  // 50%: $40 – $400 (small, very common)
  if (rand < 0.5) {
    return 40 + rng() * 360;
  }
  // 25%: $400 – $1000
  if (rand < 0.75) {
    return 400 + rng() * 600;
  }
  // 15%: $1000 – $5000
  if (rand < 0.9) {
    return 1000 + rng() * 4000;
  }
  // 7%: $5000 – $15000
  if (rand < 0.97) {
    return 5000 + rng() * 10000;
  }
  // 3%: $15000 – $50000 (rare)
  return 15000 + rng() * 35000;
};

// Calculate to amount based on exchange rate (simplified)
const calculateToAmount = (fromAmount: number, fromSymbol: string, toSymbol: string): string => {
  const fromPrice = cryptoPrices[fromSymbol] || 1;
  const toPrice = cryptoPrices[toSymbol] || 1;
  const usdValue = fromAmount * fromPrice;
  const toAmount = usdValue / toPrice;
  
  // Apply small exchange fee (0.5%)
  const finalAmount = toAmount * 0.995;
  
  // Ensure minimum amount to avoid zeros
  if (finalAmount <= 0 || isNaN(finalAmount) || !isFinite(finalAmount)) {
    return '0.01';
  }
  
  // Format based on amount size, remove trailing zeros
  let formatted: string;
  if (finalAmount < 0.00001) {
    formatted = finalAmount.toFixed(8);
  } else if (finalAmount < 0.01) {
    formatted = finalAmount.toFixed(6);
  } else if (finalAmount < 1) {
    formatted = finalAmount.toFixed(4);
  } else if (finalAmount < 100) {
    formatted = finalAmount.toFixed(2);
  } else {
    formatted = Math.round(finalAmount).toLocaleString();
  }
  
  // Remove trailing zeros and unnecessary decimal point
  return formatted.replace(/\.?0+$/, '');
};

// Deterministic random number generator based on seed
function seededRandom(seed: number): () => number {
  let value = Math.abs(seed);
  if (value === 0) value = 1;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const getRandomPair = (rng: () => number): { from: string; to: string } => {
  const i = Math.floor(rng() * TOP_PAIRS.length);
  return TOP_PAIRS[i];
};

const generateRandomTransaction = (seed: number, fromSymbol: string, toSymbol: string): Transaction => {
  const rng = seededRandom(seed);
  const usdValue = generateRandomUSDValue(rng);
  const safeUsdValue = Math.max(usdValue, 40);
  const fromAmount = generateRandomAmount(fromSymbol, safeUsdValue);
  const fromAmountNum = parseFloat(fromAmount);
  const toAmount = calculateToAmount(fromAmountNum, fromSymbol, toSymbol);
  
  const fromImageUrl = getCryptoImageUrl(fromSymbol);
  const toImageUrl = getCryptoImageUrl(toSymbol);
  const id = Math.abs(seed).toString(36).substr(0, 9);
  
  return {
    id,
    timestamp: 0,
    completedAt: 0,
    fromAmount,
    fromSymbol,
    fromImageUrl,
    toAmount,
    toSymbol,
    toImageUrl,
  };
};

// Format time ago with approximate format (for order creation - left side)
const formatTimeAgoApproximate = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 0) {
    return 'just now';
  }
  
  if (seconds < 60) {
    return 'a few seconds ago';
  } else if (seconds < 120) {
    return 'a minute ago';
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minutes ago`;
  } else if (seconds < 7200) {
    return 'an hour ago';
  } else {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hours ago`;
  }
};

// Short time for mobile single-row (e.g. "now", "2m", "1h")
const formatTimeAgoShort = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
};

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const now = Date.now();
    const seedBase = Math.floor(now / 1000);
    const list: Transaction[] = [];

    for (let i = 0; i < MAX_VISIBLE; i++) {
      const rng = seededRandom(seedBase + i * 7919);
      const pair = getRandomPair(rng);
      const txSeed = seedBase + i * 9973;
      const tx = generateRandomTransaction(txSeed, pair.from, pair.to);
      const staggerMs = (MAX_VISIBLE - 1 - i) * 800 + Math.floor(rng() * 500);
      const orderCreatedAt = now - staggerMs;
      const durationSec = Math.floor(rng() * 45) + 5;
      tx.timestamp = orderCreatedAt;
      tx.completedAt = orderCreatedAt + durationSec * 1000;
      list.push(tx);
    }
    return list.reverse();
  });

  // Add new transaction every 2–5 sec (random), keep only 7, drop oldest
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const scheduleNext = () => {
      const delay = 2000 + Math.floor(Math.random() * 3000);
      timeoutId = setTimeout(() => {
        const rng = seededRandom(Date.now());
        const pair = getRandomPair(rng);
        const tx = generateRandomTransaction(Date.now() % 1e9, pair.from, pair.to);
        const now = Date.now();
        tx.timestamp = now - Math.floor(rng() * 4000);
        const durationSec = Math.floor(rng() * 50) + 5;
        tx.completedAt = tx.timestamp + durationSec * 1000;

        setTransactions((prev) => [tx, ...prev].slice(0, MAX_VISIBLE));
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, []);

  // Update "time ago" labels every 10 sec (no layout change, just text)
  useEffect(() => {
    const interval = setInterval(() => {
      setTransactions((prev) => prev.map((t) => ({ ...t })));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full">
      <div className="space-y-2 sm:space-y-2">
        {transactions.slice(0, MAX_VISIBLE).map((transaction, index) => {
          const isRecent = index === 0;
          return (
            <div
              key={transaction.id}
              className={`flex flex-row items-center gap-2 sm:gap-4 py-3 px-3 sm:py-3.5 sm:px-5 rounded-[8px] bg-[#0f1629] border border-white/[0.06] transition-all ${
                isRecent ? "ring-1 ring-sky-400/30 shadow-[0_0_20px_-5px_rgba(56,189,248,0.25)]" : "hover:bg-[#131c33]"
              }`}
            >
              {/* From: icon + amount */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 shrink">
                <CryptoIcon
                  symbol={transaction.fromSymbol}
                  imageUrl={transaction.fromImageUrl}
                  className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
                />
                <span className="text-white font-semibold text-sm sm:text-base truncate">
                  {transaction.fromAmount} {transaction.fromSymbol}
                </span>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0">
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400/90" aria-hidden />
              </div>

              {/* To: icon + symbol */}
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 sm:min-w-[80px] shrink-0">
                <CryptoIcon
                  symbol={transaction.toSymbol}
                  imageUrl={transaction.toImageUrl}
                  className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
                />
                <span className="text-white font-semibold text-sm sm:text-base truncate">
                  {transaction.toSymbol}
                </span>
              </div>

              {/* Time (right): one label only — relative time */}
              <div className="text-white/90 text-xs sm:text-sm font-medium shrink-0 min-w-0 sm:min-w-[70px] text-right">
                <span className="sm:hidden">{formatTimeAgoShort(transaction.timestamp)}</span>
                <span className="hidden sm:inline truncate max-w-[100px] sm:max-w-none">
                  {formatTimeAgoApproximate(transaction.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
