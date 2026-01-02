"use client";

import { useEffect, useState } from "react";
import CryptoIcon from "./CryptoIcon";

interface Transaction {
  id: string;
  timeAgo: string;
  fromAmount: string;
  fromSymbol: string;
  toSymbol: string;
  duration: string;
}

// Generate random transaction amount based on distribution
const generateRandomAmount = (fromSymbol: string, targetUSDValue: number): string => {
  // Approximate USD values for different crypto
  const priceMap: Record<string, number> = {
    BTC: 43250,
    ETH: 2650,
    USDT: 1,
    BNB: 315,
    SOL: 98,
    LTC: 68,
    TON: 2.5,
  };
  
  const cryptoPrice = priceMap[fromSymbol] || 1;
  const amount = targetUSDValue / cryptoPrice;
  
  // Format based on amount size
  if (amount < 0.01) {
    return amount.toFixed(8);
  } else if (amount < 1) {
    return amount.toFixed(5);
  } else if (amount < 100) {
    return amount.toFixed(2);
  } else {
    return amount.toFixed(0);
  }
};

// Generate random USD value with weighted distribution
const generateRandomUSDValue = (): number => {
  const rand = Math.random();
  // 60% chance: $20-$100
  if (rand < 0.6) {
    return 20 + Math.random() * 80;
  }
  // 25% chance: $100-$1000
  else if (rand < 0.85) {
    return 100 + Math.random() * 900;
  }
  // 10% chance: $1000-$4000
  else if (rand < 0.95) {
    return 1000 + Math.random() * 3000;
  }
  // 5% chance: $4000-$15000
  else {
    return 4000 + Math.random() * 11000;
  }
};

const generateRandomTransaction = (): Transaction => {
  const currencies = ["BTC", "ETH", "USDT", "USDC", "BNB", "SOL", "LTC", "TRX", "DOGE", "DASH"];
  const fromSymbol = currencies[Math.floor(Math.random() * currencies.length)];
  let toSymbol = currencies[Math.floor(Math.random() * currencies.length)];
  // Ensure different currencies
  while (toSymbol === fromSymbol) {
    toSymbol = currencies[Math.floor(Math.random() * currencies.length)];
  }
  
  const usdValue = generateRandomUSDValue();
  const fromAmount = generateRandomAmount(fromSymbol, usdValue);
  const duration = Math.floor(Math.random() * 35) + 1;
  
  const timeOptions = [
    "a few seconds ago",
    "a few seconds ago",
    "a few seconds ago",
    "a few seconds ago",
    "a few seconds ago",
    "a minute ago",
    "a minute ago",
    "2 minutes ago",
    "3 minutes ago",
  ];
  const timeAgo = timeOptions[Math.floor(Math.random() * timeOptions.length)];
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    timeAgo,
    fromAmount,
    fromSymbol,
    toSymbol,
    duration: `${duration} sec`,
  };
};

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    return Array.from({ length: 10 }, () => generateRandomTransaction());
  });

  // Update transactions with random interval between 2-5 seconds
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const scheduleNextUpdate = () => {
      const randomDelay = 2000 + Math.random() * 3000; // 2000-5000ms
      
      timeoutId = setTimeout(() => {
        setTransactions((prev) => {
          const newTransaction = generateRandomTransaction();
          // Add new transaction at the beginning, keep max 10 transactions
          const updated = [newTransaction, ...prev].slice(0, 10);
          return updated;
        });
        scheduleNextUpdate();
      }, randomDelay);
    };
    
    scheduleNextUpdate();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="w-full">
      {/* Desktop: Table-like layout, Mobile: Compact stacked */}
      <div className="space-y-0">
        {transactions.map((transaction, index) => (
          <div
            key={transaction.id}
            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 md:gap-6 py-2.5 sm:py-3 md:py-3.5 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors"
            style={{
              animation: index === 0 ? 'slideIn 0.5s ease-out' : 'none',
            }}
          >
            {/* Mobile: Top row with time and duration */}
            <div className="flex items-center justify-between sm:hidden">
              <div className="text-xs text-neutral-400">
                {transaction.timeAgo}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{transaction.duration}</span>
              </div>
            </div>

            {/* Mobile: Middle row with transaction */}
            <div className="flex items-center justify-center gap-2 sm:hidden">
              <div className="flex items-center gap-1.5">
                <div className="text-white font-medium text-sm">
                  {transaction.fromAmount} {transaction.fromSymbol}
                </div>
                <CryptoIcon symbol={transaction.fromSymbol} className="w-5 h-5 flex-shrink-0" />
              </div>
              <span className="text-white text-lg">→</span>
              <div className="flex items-center gap-1.5">
                <CryptoIcon symbol={transaction.toSymbol} className="w-5 h-5 flex-shrink-0" />
                <div className="text-white font-medium text-sm">
                  {transaction.toSymbol}
                </div>
              </div>
            </div>

            {/* Desktop: Full horizontal layout */}
            {/* Time - Left aligned */}
            <div className="hidden sm:block text-sm md:text-base text-neutral-400 min-w-[140px] md:min-w-[160px]">
              {transaction.timeAgo}
            </div>

            {/* From Amount & Currency */}
            <div className="hidden sm:flex items-center gap-2 md:gap-2.5 flex-shrink-0">
              <div className="text-white font-medium text-sm md:text-base">
                {transaction.fromAmount} {transaction.fromSymbol}
              </div>
              <CryptoIcon symbol={transaction.fromSymbol} className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            </div>

            {/* Arrow */}
            <div className="hidden sm:block flex-shrink-0">
              <span className="text-white text-lg md:text-xl">→</span>
            </div>

            {/* To Currency */}
            <div className="hidden sm:flex items-center gap-2 md:gap-2.5 flex-shrink-0">
              <CryptoIcon symbol={transaction.toSymbol} className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
              <div className="text-white font-medium text-sm md:text-base">
                {transaction.toSymbol}
              </div>
            </div>

            {/* Duration - Right aligned */}
            <div className="hidden sm:flex items-center gap-1.5 md:gap-2 ml-auto text-neutral-400 flex-shrink-0">
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs md:text-sm">{transaction.duration}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

