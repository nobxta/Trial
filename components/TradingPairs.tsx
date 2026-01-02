"use client";

import { Search, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";

interface Pair {
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume: number;
}

const pairs: Pair[] = [
  { symbol: "BTC/USDT", name: "Bitcoin", price: 43250.5, change: 2.45, volume: 1250000000 },
  { symbol: "ETH/USDT", name: "Ethereum", price: 2650.75, change: -1.23, volume: 850000000 },
  { symbol: "BNB/USDT", name: "BNB", price: 315.42, change: 0.87, volume: 320000000 },
  { symbol: "SOL/USDT", name: "Solana", price: 98.25, change: 3.12, volume: 450000000 },
  { symbol: "XRP/USDT", name: "Ripple", price: 0.542, change: -0.45, volume: 280000000 },
  { symbol: "ADA/USDT", name: "Cardano", price: 0.485, change: 1.56, volume: 150000000 },
  { symbol: "DOGE/USDT", name: "Dogecoin", price: 0.082, change: -2.34, volume: 180000000 },
  { symbol: "MATIC/USDT", name: "Polygon", price: 0.875, change: 0.92, volume: 120000000 },
];

export default function TradingPairs({
  selectedPair,
  onSelectPair,
}: {
  selectedPair: string;
  onSelectPair: (pair: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filteredPairs = pairs.filter(
    (pair) =>
      pair.symbol.toLowerCase().includes(search.toLowerCase()) ||
      pair.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background-tertiary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredPairs.map((pair) => (
            <button
              key={pair.symbol}
              onClick={() => onSelectPair(pair.symbol)}
              className={`w-full p-3 rounded-lg mb-1 text-left transition-colors ${
                selectedPair === pair.symbol
                  ? "bg-accent/20 border border-accent"
                  : "bg-background-tertiary hover:bg-background-tertiary/80 border border-transparent"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-text-primary font-medium text-sm">
                  {pair.symbol.split("/")[0]}
                </span>
                <span className="text-text-secondary text-xs">
                  {pair.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-xs">{pair.name}</span>
                <span
                  className={`text-xs font-medium flex items-center gap-1 ${
                    pair.change >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {pair.change >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(pair.change).toFixed(2)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

