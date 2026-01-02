-- DEPRECATED: merged into 000_final_schema.sql
-- Create order_status_history table for audit trail
-- Tracks all status changes with timestamp and source
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL, -- 'webhook' | 'polling' | 'manual' | 'system'
  payment_status TEXT, -- Original NOWPayments payment_status if from webhook
  metadata JSONB, -- Additional context (payment_id, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_status ON order_status_history(status);

-- Enable Row Level Security
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
CREATE POLICY "Service role full access" ON order_status_history
  FOR ALL
  USING (true)
  WITH CHECK (true);




