-- Add payment mode support to orders table
-- This allows tracking whether a payment was created in LIVE or SANDBOX mode

-- Add payment_mode column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_mode TEXT CHECK (payment_mode IN ('live', 'sandbox'));

-- Add purchase_id column (NOWPayments purchase_id for tracking)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS purchase_id TEXT;

-- Add sandbox_case column (for sandbox testing scenarios)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS sandbox_case TEXT CHECK (sandbox_case IN ('success', 'failed', 'expired', 'partially_paid'));

-- Create index on payment_mode for filtering
CREATE INDEX IF NOT EXISTS idx_orders_payment_mode ON orders(payment_mode);

-- Create index on purchase_id for lookups
CREATE INDEX IF NOT EXISTS idx_orders_purchase_id ON orders(purchase_id);

-- Add comments
COMMENT ON COLUMN orders.payment_mode IS 'Payment mode: live (real payments) or sandbox (test payments)';
COMMENT ON COLUMN orders.purchase_id IS 'NOWPayments purchase_id for tracking multiple payments per order';
COMMENT ON COLUMN orders.sandbox_case IS 'Sandbox test case scenario (only used in sandbox mode)';

-- Create payment_mode setting in exchange_settings (similar to payout_mode)
INSERT INTO exchange_settings (key, value)
VALUES ('payment_mode', '{"mode": "live"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Add comment for the setting
COMMENT ON TABLE exchange_settings IS 'Global exchange settings including payment_mode (live/sandbox) and payout_mode (manual/automatic)';

