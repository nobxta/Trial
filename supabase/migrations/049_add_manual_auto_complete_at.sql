-- Randomized manual payout auto-complete: per-order scheduled timestamp (3–15 min from first PAYMENT_CONFIRMED).
-- Cron selects orders where manual_auto_complete_at <= now() instead of a fixed 15-minute threshold.

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS manual_auto_complete_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.manual_auto_complete_at IS 'When to auto-complete this manual payout order (set once when status first becomes PAYMENT_CONFIRMED/PROCESSING_BY_PROVIDER/MANUAL_REVIEW). Random 3–15 min from that moment. NULL = not scheduled or automatic order.';

CREATE INDEX IF NOT EXISTS idx_orders_manual_auto_complete_at
ON orders(manual_auto_complete_at)
WHERE payout_mode = 'manual' AND manual_auto_complete_at IS NOT NULL;
