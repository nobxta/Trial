"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export default function TradingPanel({ pair }: { pair: string }) {
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("43250.00");
  const [amount, setAmount] = useState("");
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");

  const balance = {
    USDT: 12500.50,
    BTC: 0.285,
  };

  const handlePercentage = (percent: number) => {
    const maxAmount = activeTab === "buy" ? balance.USDT / parseFloat(price) : balance.BTC;
    setAmount((maxAmount * (percent / 100)).toFixed(8));
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab("buy")}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === "buy"
                ? "bg-success/20 text-success border-b-2 border-success"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <ArrowUp className="w-4 h-4 inline mr-2" />
            Buy
          </button>
          <button
            onClick={() => setActiveTab("sell")}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === "sell"
                ? "bg-danger/20 text-danger border-b-2 border-danger"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <ArrowDown className="w-4 h-4 inline mr-2" />
            Sell
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Order Type Toggle */}
        <div className="flex gap-2 mb-4 bg-background-tertiary p-1 rounded-lg">
          <button
            onClick={() => setOrderType("limit")}
            className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
              orderType === "limit"
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Limit
          </button>
          <button
            onClick={() => setOrderType("market")}
            className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
              orderType === "market"
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Market
          </button>
        </div>

        {/* Price Input */}
        {orderType === "limit" && (
          <div className="mb-4">
            <label className="block text-sm text-text-secondary mb-2">Price (USDT)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-3 bg-background-tertiary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
              placeholder="0.00"
            />
          </div>
        )}

        {/* Amount Input */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-text-secondary">Amount</label>
            <span className="text-xs text-text-muted">
              Available: {activeTab === "buy" ? balance.USDT.toFixed(2) : balance.BTC.toFixed(8)} {activeTab === "buy" ? pair.split("/")[1] : pair.split("/")[0]}
            </span>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 bg-background-tertiary border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
            placeholder="0.00000000"
            step="any"
          />
          <div className="flex gap-2 mt-2">
            {[25, 50, 75, 100].map((percent) => (
              <button
                key={percent}
                onClick={() => handlePercentage(percent)}
                className="flex-1 py-1.5 px-3 bg-background-tertiary hover:bg-background-tertiary/80 border border-border rounded text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                {percent}%
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        {orderType === "limit" && amount && (
          <div className="mb-4">
            <label className="block text-sm text-text-secondary mb-2">Total</label>
            <input
              type="text"
              value={(parseFloat(price) * parseFloat(amount || "0")).toFixed(2)}
              readOnly
              className="w-full px-4 py-3 bg-background-tertiary border border-border rounded-lg text-text-primary opacity-60"
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          className={`w-full py-4 rounded-lg font-semibold text-white transition-colors ${
            activeTab === "buy"
              ? "bg-success hover:bg-success/90"
              : "bg-danger hover:bg-danger/90"
          }`}
        >
          {activeTab === "buy" ? "Buy" : "Sell"} {pair.split("/")[0]}
        </button>

        {/* Balance Info */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-secondary">Available Balance</span>
            <span className="text-text-primary font-medium">
              {activeTab === "buy"
                ? `${balance.USDT.toFixed(2)} USDT`
                : `${balance.BTC.toFixed(8)} BTC`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

