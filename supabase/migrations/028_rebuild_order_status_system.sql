-- DEPRECATED: merged into 000_final_schema.sql
-- CRITICAL: Rebuild Order Status System
-- Backend as source of truth, proper status separation

-- Add internal_status (admin-only technical status)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_status TEXT;
-- Set existing orders to use status as internal_status
UPDATE orders SET internal_status = status WHERE internal_status IS NULL;

-- Add user_status (user-facing simplified status)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_status TEXT;

-- Add provider_status (raw status from NOWPayments, admin-only)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_status TEXT;

-- Add status_source (who/what changed the status)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_source TEXT; -- 'webhook' | 'admin' | 'system'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_updated_by UUID REFERENCES admin_users(id);

-- Add rate validation fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_rate DECIMAL(20, 8);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_receive DECIMAL(20, 8);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rate_timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rate_deviation_percent DECIMAL(5, 2);

-- Add transaction hash fields (for manual payouts)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payin_hash TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_hash TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_hash_entered_by UUID REFERENCES admin_users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_hash_entered_at TIMESTAMP WITH TIME ZONE;

-- Add manual review fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manual_review_required BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manual_review_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manual_review_assigned_to UUID REFERENCES admin_users(id);

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_orders_internal_status ON orders(internal_status);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_status);
CREATE INDEX IF NOT EXISTS idx_orders_manual_review ON orders(manual_review_required) WHERE manual_review_required = TRUE;
CREATE INDEX IF NOT EXISTS idx_orders_status_source ON orders(status_source);

-- Update existing orders to have proper status mapping
-- This will be handled by backend status mapping function, but set defaults here
UPDATE orders 
SET 
  internal_status = CASE 
    WHEN status = 'pending' THEN 'NEW'
    WHEN status = 'confirming' THEN 'CONFIRMING'
    WHEN status = 'confirmed' THEN 'PAYMENT_CONFIRMED'
    WHEN status = 'exchange' THEN 'PROCESSING_BY_PROVIDER'
    WHEN status = 'done' THEN 'DONE'
    WHEN status = 'expired' THEN 'EXPIRED'
    WHEN status = 'failed' THEN 'FAILED'
    ELSE 'NEW'
  END,
  user_status = CASE 
    WHEN status = 'pending' THEN 'Waiting for payment'
    WHEN status = 'confirming' THEN 'Waiting for confirmation'
    WHEN status = 'confirmed' THEN 'Payment confirmed'
    WHEN status = 'exchange' THEN 'Processing'
    WHEN status = 'done' THEN 'Completed'
    WHEN status = 'expired' THEN 'Expired'
    WHEN status = 'failed' THEN 'Failed'
    ELSE 'Waiting for payment'
  END,
  status_source = 'system'
WHERE internal_status IS NULL OR user_status IS NULL;

-- Ensure status column is kept for backward compatibility but internal_status is primary
COMMENT ON COLUMN orders.status IS 'DEPRECATED: Use internal_status instead. Kept for backward compatibility.';
COMMENT ON COLUMN orders.internal_status IS 'Internal technical status (admin-only): NEW, AWAITING_DEPOSIT, CONFIRMING, PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, MANUAL_REVIEW, DONE, FAILED, EXPIRED';
COMMENT ON COLUMN orders.user_status IS 'User-facing simplified status: Waiting for payment, Waiting for confirmation, Payment confirmed, Processing, Completed, Failed, Expired';
COMMENT ON COLUMN orders.provider_status IS 'Raw status from NOWPayments API (admin-only reference)';




