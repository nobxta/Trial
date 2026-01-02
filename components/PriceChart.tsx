"use client";

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useState } from "react";

interface PriceChartProps {
  pair: string;
}

const generateMockData = () => {
  const data = [];
  const basePrice = 43250;
  let currentPrice = basePrice;
  
  for (let i = 0; i < 100; i++) {
    const change = (Math.random() - 0.5) * 500;
    currentPrice = Math.max(basePrice * 0.9, Math.min(basePrice * 1.1, currentPrice + change));
    data.push({
      time: i,
      price: currentPrice,
    });
  }
  return data;
};

export default function PriceChart({ pair }: PriceChartProps) {
  const [timeframe, setTimeframe] = useState("1H");
  const data = generateMockData();
  const currentPrice = data[data.length - 1]?.price || 0;
  const previousPrice = data[0]?.price || 0;
  const change = ((currentPrice - previousPrice) / previousPrice) * 100;
  const isPositive = change >= 0;

  const timeframes = ["1M", "5M", "15M", "1H", "4H", "1D", "1W"];

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{pair}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-2xl font-bold text-text-primary">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-sm font-medium ${isPositive ? "text-success" : "text-danger"}`}>
              {isPositive ? "+" : ""}
              {change.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeframe === tf
                  ? "bg-accent text-white"
                  : "bg-background-tertiary text-text-secondary hover:text-text-primary"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="time" hide />
            <YAxis
              domain={["dataMin - 100", "dataMax + 100"]}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1f3a",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#ffffff",
              }}
              formatter={(value: number) => [
                `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                "Price",
              ]}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={isPositive ? "#10b981" : "#ef4444"}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

