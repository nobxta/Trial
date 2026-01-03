"use client";

import { useEffect, useState, useMemo } from "react";
import CryptoIcon from "./CryptoIcon";
import { getCryptosBySymbol, SupportedCrypto } from "@/lib/supported-cryptos";

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

// Realistic crypto prices (approximate)
const cryptoPrices: Record<string, number> = {
  BTC: 43250,
  ETH: 2650,
  USDT: 1,
  USDC: 1,
  BNB: 315,
  SOL: 98,
  LTC: 68,
  TON: 2.5,
  TRX: 0.11,
  DOGE: 0.08,
  DASH: 28,
  XRP: 0.52,
  ADA: 0.48,
  MATIC: 0.75,
};

// Generate realistic transaction amount
const generateRandomAmount = (symbol: string, targetUSDValue: number): string => {
  const price = cryptoPrices[symbol] || 1;
  const amount = targetUSDValue / price;
  
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

// Generate realistic USD value distribution (minimum $20)
const generateRandomUSDValue = (rng: () => number): number => {
  const rand = rng();
  // 50% chance: $20-$100 (small transactions)
  if (rand < 0.5) {
    return 20 + rng() * 80;
  }
  // 30% chance: $100-$500 (medium transactions)
  else if (rand < 0.8) {
    return 100 + rng() * 400;
  }
  // 15% chance: $500-$2000 (large transactions)
  else if (rand < 0.95) {
    return 500 + rng() * 1500;
  }
  // 5% chance: $2000-$10000 (very large transactions)
  else {
    return 2000 + rng() * 8000;
  }
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
  // Ensure seed is large enough for good distribution
  if (value === 0) value = 1;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const generateRandomTransaction = (seed: number): Transaction => {
  const rng = seededRandom(seed);
  const currencies = ["BTC", "ETH", "USDT", "USDC", "BNB", "SOL", "LTC", "TRX", "DOGE", "DASH", "TON", "XRP", "ADA", "MATIC"];
  const fromIndex = Math.floor(rng() * currencies.length);
  const fromSymbol = currencies[fromIndex];
  let toIndex = Math.floor(rng() * currencies.length);
  
  // Ensure different currencies
  while (toIndex === fromIndex) {
    toIndex = Math.floor(rng() * currencies.length);
  }
  const toSymbol = currencies[toIndex];
  
  const usdValue = generateRandomUSDValue(rng);
  // Ensure minimum USD value to prevent zero amounts
  const safeUsdValue = Math.max(usdValue, 20);
  const fromAmount = generateRandomAmount(fromSymbol, safeUsdValue);
  const fromAmountNum = parseFloat(fromAmount);
  const toAmount = calculateToAmount(fromAmountNum, fromSymbol, toSymbol);
  
  // Fetch imageUrls from supported cryptos
  const fromImageUrl = getCryptoImageUrl(fromSymbol);
  const toImageUrl = getCryptoImageUrl(toSymbol);
  
  // Generate deterministic ID from seed
  const id = Math.abs(seed).toString(36).substr(0, 9);
  
  return {
    id,
    timestamp: 0, // Will be set by component
    completedAt: 0, // Will be set by component
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

// Format duration in seconds (for swap completion - right side)
const formatDurationSeconds = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 0) {
    return '0 sec';
  }
  
  return `${seconds} sec`;
};

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    // Use time-based seed for deterministic generation (same for all users)
    // Seed based on current minute to ensure consistency across users
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000); // Minutes since epoch
    const baseSeed = currentMinute * 10000; // Base seed for this minute (larger multiplier for better distribution)
    
    // Initialize with staggered timestamps (newest first, oldest last)
    return Array.from({ length: 10 }, (_, i) => {
      // Create unique seed for each transaction - use larger increments to ensure diversity
      // Multiply index by large prime to ensure different sequences
      const seed = baseSeed + (i * 7919) + Math.floor(i / 2) * 9973; // Use prime numbers for better distribution
      const rng = seededRandom(seed);
      
      // Order creation time - newest transactions first (i=0 is most recent)
      // Stagger backwards so newest is at top, with deterministic offset
      const staggerOffset = (i * 5000) + Math.floor(rng() * 3000);
      const orderCreatedAt = now - staggerOffset;
      
      // Swap completion time - deterministic random 5-60 seconds AFTER order creation
      const swapDurationSeconds = Math.floor(rng() * 55) + 5; // 5-60 seconds
      const swapCompletedAt = orderCreatedAt + (swapDurationSeconds * 1000);
      
      const tx = generateRandomTransaction(seed);
      tx.timestamp = orderCreatedAt;
      tx.completedAt = swapCompletedAt;
      return tx;
    });
  });

  // Update time display every second for live countdown
  // Also regenerate transactions when minute changes (for consistency)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const currentMinute = Math.floor(now / 60000);
      const baseSeed = currentMinute * 1000;
      
      setTransactions((prev) => {
        // Check if we need to regenerate (new minute = new seed)
        const prevMinute = Math.floor((prev[0]?.timestamp || now) / 60000);
        
        if (currentMinute !== prevMinute) {
          // New minute - regenerate all transactions with new seed
          return Array.from({ length: 10 }, (_, i) => {
            // Use larger increments to ensure different currency pairs
            const seed = baseSeed + (i * 7919) + Math.floor(i / 2) * 9973;
            const rng = seededRandom(seed);
            const staggerOffset = (i * 5000) + Math.floor(rng() * 3000);
            const orderCreatedAt = now - staggerOffset;
            const swapDurationSeconds = Math.floor(rng() * 55) + 5;
            const swapCompletedAt = orderCreatedAt + (swapDurationSeconds * 1000);
            
            const tx = generateRandomTransaction(seed);
            tx.timestamp = orderCreatedAt;
            tx.completedAt = swapCompletedAt;
            return tx;
          });
        } else {
          // Same minute - just update timestamps for live countdown
          return prev.map(tx => ({ ...tx }));
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Add new transactions with deterministic interval (same for all users)
  // Use time-based scheduling so all users see new transactions at the same time
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const scheduleNextUpdate = () => {
      const now = Date.now();
      // Schedule next update at the next 5-second mark (e.g., :00, :05, :10, :15, etc.)
      // This ensures all users see new transactions at the same time
      const nextUpdate = Math.ceil(now / 5000) * 5000;
      const delay = nextUpdate - now;
      
      timeoutId = setTimeout(() => {
        setTransactions((prev) => {
          const currentMinute = Math.floor(Date.now() / 60000);
          const baseSeed = currentMinute * 10000;
          // Use a high index with prime multipliers to ensure unique seed for new transaction
          const seed = baseSeed + (prev.length * 7919) + (Date.now() % 9973);
          const rng = seededRandom(seed);
          
          const newTransaction = generateRandomTransaction(seed);
          // Order was created just now (or a few seconds ago for realism)
          const orderCreatedAt = Date.now() - Math.floor(rng() * 3000); // 0-3 seconds ago
          const swapDurationSeconds = Math.floor(rng() * 55) + 5; // 5-60 seconds
          const swapCompletedAt = Math.min(orderCreatedAt + (swapDurationSeconds * 1000), Date.now() - 1000);
          
          newTransaction.timestamp = orderCreatedAt;
          newTransaction.completedAt = swapCompletedAt;
          
          // Add new transaction at the beginning, keep max 10 transactions
          const updated = [newTransaction, ...prev].slice(0, 10);
          return updated;
        });
        scheduleNextUpdate();
      }, delay);
    };
    
    scheduleNextUpdate();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="w-full">
      <div className="space-y-0">
        {transactions.slice(0, 10).map((transaction, index) => (
          <div
            key={transaction.id}
            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 md:gap-6 py-2.5 sm:py-3.5 md:py-4 px-2 sm:px-0 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors"
            style={{
              animation: index === 0 ? 'slideIn 0.5s ease-out' : 'none',
            }}
          >
            {/* Mobile Layout */}
            {/* Times - Top Row */}
            <div className="flex items-center justify-between sm:hidden w-full px-1">
              <div className="text-[10px] xs:text-xs text-neutral-400 font-medium truncate">
                {formatTimeAgoApproximate(transaction.timestamp)}
              </div>
              <div className="text-[10px] xs:text-xs text-neutral-400 font-medium">
                {formatDurationSeconds(transaction.completedAt)}
              </div>
            </div>

            {/* Transaction Details - Middle Row */}
            <div className="flex items-center justify-between sm:hidden w-full px-1 gap-2">
              {/* From Currency */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <CryptoIcon symbol={transaction.fromSymbol} imageUrl={transaction.fromImageUrl} className="w-5 h-5 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <div className="text-white font-semibold text-xs xs:text-sm truncate">
                    {transaction.fromAmount}
                  </div>
                  <div className="text-neutral-400 text-[10px] xs:text-xs font-medium">
                    {transaction.fromSymbol}
                  </div>
                </div>
              </div>
              
              {/* Arrow */}
              <span className="text-blue-400 text-base xs:text-lg font-bold flex-shrink-0">→</span>
              
              {/* To Currency */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                <div className="flex flex-col min-w-0 items-end">
                  <div className="text-white font-semibold text-xs xs:text-sm truncate">
                    {transaction.toAmount}
                  </div>
                  <div className="text-neutral-400 text-[10px] xs:text-xs font-medium">
                    {transaction.toSymbol}
                  </div>
                </div>
                <CryptoIcon symbol={transaction.toSymbol} imageUrl={transaction.toImageUrl} className="w-5 h-5 flex-shrink-0" />
              </div>
            </div>

            {/* Desktop Layout */}
            {/* Order Creation Time - Left aligned (approximate) */}
            <div className="hidden sm:block text-sm md:text-base text-neutral-400 min-w-[140px] md:min-w-[160px] font-medium">
              {formatTimeAgoApproximate(transaction.timestamp)}
            </div>

            {/* Transaction Details - Center, uses remaining space */}
            <div className="hidden sm:flex items-center gap-3 md:gap-4 flex-1 justify-center">
              {/* From Currency with Icon */}
              <div className="flex items-center gap-2.5 md:gap-3">
                <CryptoIcon symbol={transaction.fromSymbol} imageUrl={transaction.fromImageUrl} className="w-6 h-6 md:w-7 md:h-7 flex-shrink-0" />
                <div className="flex flex-col">
                  <div className="text-white font-semibold text-sm md:text-base">
                    {transaction.fromAmount}
                  </div>
                  <div className="text-neutral-400 text-xs md:text-sm font-medium">
                    {transaction.fromSymbol}
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0 mx-2 md:mx-3">
                <span className="text-blue-400 text-xl md:text-2xl font-bold">→</span>
              </div>

              {/* To Currency with Icon */}
              <div className="flex items-center gap-2.5 md:gap-3">
                <CryptoIcon symbol={transaction.toSymbol} imageUrl={transaction.toImageUrl} className="w-6 h-6 md:w-7 md:h-7 flex-shrink-0" />
                <div className="flex flex-col">
                  <div className="text-white font-semibold text-sm md:text-base">
                    {transaction.toAmount}
                  </div>
                  <div className="text-neutral-400 text-xs md:text-sm font-medium">
                    {transaction.toSymbol}
                  </div>
                </div>
              </div>
            </div>

            {/* Swap Completion Duration - Right aligned (exact seconds) */}
            <div className="hidden sm:block text-sm md:text-base text-neutral-400 min-w-[140px] md:min-w-[160px] font-medium text-right">
              {formatDurationSeconds(transaction.completedAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
