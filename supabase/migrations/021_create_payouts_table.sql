-- DEPRECATED: merged into 000_final_schema.sql
-- Create payouts table for payout management
CREATE TABLE IF NOT EXISTS payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT REFERENCES orders(order_id) ON DELETE SET NULL,
  wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  network TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  recipient_address TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  initiated_by UUID REFERENCES admin_users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payouts_order_id ON payouts(order_id);
CREATE INDEX IF NOT EXISTS idx_payouts_wallet_id ON payouts(wallet_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_tx_hash ON payouts(tx_hash);

-- Create updated_at trigger
CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
CREATE POLICY "Service role full access" ON payouts
  FOR ALL
  USING (true)
  WITH CHECK (true);


