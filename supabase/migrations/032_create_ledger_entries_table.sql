-- Create ledger_entries table for immutable financial ledger
-- This is the source of truth for all financial transactions
-- No updates, no deletes - append-only ledger

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT, -- References orders.order_id (nullable for non-order transactions)
  user_id UUID, -- References users.id (nullable for system transactions)
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  category TEXT NOT NULL, -- e.g., 'deposit', 'fee', 'payout', 'refund'
  amount NUMERIC(20, 8) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index on user_id for balance calculations
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON ledger_entries(user_id);

-- Index on order_id for order-related queries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_order_id ON ledger_entries(order_id);

-- Index on created_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at DESC);

-- Composite index for user balance queries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_currency ON ledger_entries(user_id, currency);

-- Comments for documentation
COMMENT ON TABLE ledger_entries IS 'Immutable financial ledger. Source of truth for all financial transactions. Append-only (no updates/deletes).';
COMMENT ON COLUMN ledger_entries.type IS 'credit: money added, debit: money removed';
COMMENT ON COLUMN ledger_entries.category IS 'Transaction category: deposit, fee, payout, refund, etc.';
COMMENT ON COLUMN ledger_entries.amount IS 'Always positive. Type determines if credit or debit.';
COMMENT ON COLUMN ledger_entries.order_id IS 'Associated order (if applicable). References orders.order_id.';

