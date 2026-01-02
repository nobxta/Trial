"use client";

interface Trade {
  price: number;
  amount: number;
  time: string;
  type: "buy" | "sell";
}

export default function TradeHistory({ pair }: { pair: string }) {
  // Mock trade history data
  const trades: Trade[] = Array.from({ length: 20 }, (_, i) => ({
    price: 43250 + (Math.random() - 0.5) * 100,
    amount: Math.random() * 1.5,
    time: new Date(Date.now() - i * 60000).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    type: Math.random() > 0.5 ? "buy" : "sell",
  }));

  const formatPrice = (price: number) =>
    price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatAmount = (amount: number) =>
    amount.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });

  return (
    <div className="h-full flex flex-col bg-background-secondary">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Recent Trades</h3>
        <p className="text-xs text-text-muted mt-1">{pair}</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="text-xs text-text-muted mb-2 px-2 flex justify-between">
            <span>Price (USDT)</span>
            <span className="text-right w-20">Amount</span>
            <span className="text-right w-16">Time</span>
          </div>
          <div className="space-y-0">
            {trades.map((trade, index) => (
              <div
                key={index}
                className="px-2 py-1.5 hover:bg-background-tertiary/50 rounded flex justify-between items-center text-xs group"
              >
                <span
                  className={`font-medium ${
                    trade.type === "buy" ? "text-success" : "text-danger"
                  }`}
                >
                  {formatPrice(trade.price)}
                </span>
                <span className="text-text-secondary text-right w-20">
                  {formatAmount(trade.amount)}
                </span>
                <span className="text-text-muted text-right w-16">{trade.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

