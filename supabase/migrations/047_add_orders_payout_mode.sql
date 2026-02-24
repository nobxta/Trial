-- Add per-order payout mode: how this order was created (manual = funds to balance, admin pays; automatic = NOWPayments sends to user).
-- Used by webhook/polling/cron to avoid setting DONE when provider reports finished for manual orders (admin marks completed later).

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payout_mode TEXT CHECK (payout_mode IN ('manual', 'automatic'));

-- Default new orders to automatic for backward compatibility; existing rows remain NULL and are treated as automatic in code
COMMENT ON COLUMN orders.payout_mode IS 'Order-level payout mode at creation: automatic (NOWPayments sends to payout_address) or manual (funds to balance, admin pays). NULL/absent = treat as automatic.';

CREATE INDEX IF NOT EXISTS idx_orders_payout_mode ON orders(payout_mode);
