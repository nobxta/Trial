"use client";

interface Order {
  price: number;
  amount: number;
  total: number;
}

export default function OrderBook({ pair }: { pair: string }) {
  // Mock order book data
  const asks: Order[] = Array.from({ length: 10 }, (_, i) => ({
    price: 43250 + (i + 1) * 10,
    amount: Math.random() * 2,
    total: 0,
  })).map((order, i, arr) => ({
    ...order,
    total: arr.slice(0, i + 1).reduce((sum, o) => sum + o.amount, 0),
  }));

  const bids: Order[] = Array.from({ length: 10 }, (_, i) => ({
    price: 43250 - (i + 1) * 10,
    amount: Math.random() * 2,
    total: 0,
  }))
    .reverse()
    .map((order, i, arr) => ({
      ...order,
      total: arr.slice(i).reduce((sum, o) => sum + o.amount, 0),
    }));

  const maxTotal = Math.max(
    ...asks.map((o) => o.total),
    ...bids.map((o) => o.total)
  );

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
        <h3 className="text-sm font-semibold text-text-primary">Order Book</h3>
        <p className="text-xs text-text-muted mt-1">{pair}</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* Asks (Sell Orders) */}
        <div className="p-2">
          <div className="text-xs text-text-muted mb-2 px-2 flex justify-between">
            <span>Price (USDT)</span>
            <span>Amount</span>
          </div>
          {asks.map((ask, index) => (
            <div
              key={index}
              className="relative group cursor-pointer hover:bg-background-tertiary/50 rounded px-2 py-1"
            >
              <div
                className="absolute left-0 top-0 h-full bg-danger/20 opacity-50"
                style={{ width: `${(ask.total / maxTotal) * 100}%` }}
              />
              <div className="relative flex justify-between text-xs">
                <span className="text-danger font-medium">{formatPrice(ask.price)}</span>
                <span className="text-text-secondary">{formatAmount(ask.amount)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Spread */}
        <div className="px-2 py-2 border-y border-border">
          <div className="text-center">
            <div className="text-lg font-bold text-text-primary">
              {formatPrice(43250)}
            </div>
            <div className="text-xs text-text-muted mt-1">
              Spread: {formatPrice(asks[0]?.price - bids[bids.length - 1]?.price || 0)}
            </div>
          </div>
        </div>

        {/* Bids (Buy Orders) */}
        <div className="p-2">
          {bids.map((bid, index) => (
            <div
              key={index}
              className="relative group cursor-pointer hover:bg-background-tertiary/50 rounded px-2 py-1"
            >
              <div
                className="absolute right-0 top-0 h-full bg-success/20 opacity-50"
                style={{ width: `${(bid.total / maxTotal) * 100}%` }}
              />
              <div className="relative flex justify-between text-xs">
                <span className="text-success font-medium">{formatPrice(bid.price)}</span>
                <span className="text-text-secondary">{formatAmount(bid.amount)}</span>
              </div>
            </div>
          ))}
          <div className="text-xs text-text-muted mt-2 px-2 flex justify-between">
            <span>Price (USDT)</span>
            <span>Amount</span>
          </div>
        </div>
      </div>
    </div>
  );
}

