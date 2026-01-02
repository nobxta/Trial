-- DEPRECATED: merged into 000_final_schema.sql
-- Create webhook_idempotency table for idempotency tracking
-- Prevents duplicate webhook processing for the same payment_id + payment_status combination
CREATE TABLE IF NOT EXISTS webhook_idempotency (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  order_id TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Unique constraint: same payment_id + payment_status should only be processed once
  UNIQUE(payment_id, payment_status)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_payment_id ON webhook_idempotency(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_order_id ON webhook_idempotency(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_processed_at ON webhook_idempotency(processed_at DESC);

-- Enable Row Level Security
ALTER TABLE webhook_idempotency ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
CREATE POLICY "Service role full access" ON webhook_idempotency
  FOR ALL
  USING (true)
  WITH CHECK (true);




