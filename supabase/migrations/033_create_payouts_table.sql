-- Create payouts table for payout management
-- Tracks payout requests and their lifecycle

CREATE TABLE IF NOT EXISTS payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(20, 8) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index on user_id for user payout queries
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON payouts(user_id);

-- Index on status for status-based queries
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

-- Index on created_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at DESC);

-- Composite index for user status queries
CREATE INDEX IF NOT EXISTS idx_payouts_user_status ON payouts(user_id, status);

-- Create updated_at trigger (if function doesn't exist, it will be created elsewhere)
-- Note: update_updated_at_column() function should already exist from other migrations
-- If it doesn't exist, create it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on payout updates
DROP TRIGGER IF EXISTS update_payouts_updated_at ON payouts;
CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE payouts IS 'Payout requests and their lifecycle. Tracks payout from request to completion.';
COMMENT ON COLUMN payouts.status IS 'pending: awaiting approval, processing: being processed, completed: successfully paid out, failed: payout failed';
COMMENT ON COLUMN payouts.completed_at IS 'Timestamp when payout reached terminal state (completed or failed)';

