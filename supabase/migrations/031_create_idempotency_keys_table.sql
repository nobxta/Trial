-- DEPRECATED: merged into 000_final_schema.sql
-- Create idempotency_keys table for preventing duplicate actions
-- Used to ensure critical actions (like email notifications) happen only once per logical event

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(scope, key)
);

-- Index on scope for faster lookups
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_scope ON idempotency_keys(scope);

-- Composite index for fast (scope, key) lookups
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_scope_key ON idempotency_keys(scope, key);

-- Comments for documentation
COMMENT ON TABLE idempotency_keys IS 'Idempotency protection for critical actions. Prevents duplicate execution of same logical event.';
COMMENT ON COLUMN idempotency_keys.scope IS 'Action scope (e.g., order_status_email, payout, refund)';
COMMENT ON COLUMN idempotency_keys.key IS 'Unique key within scope (e.g., order:123:status:DONE)';

