-- DEPRECATED: merged into 000_final_schema.sql
-- Create wallets table for wallet management
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  network TEXT NOT NULL,
  currency TEXT NOT NULL,
  address TEXT NOT NULL,
  label TEXT,
  type TEXT NOT NULL DEFAULT 'hot' CHECK (type IN ('hot', 'cold', 'payout')),
  balance DECIMAL(20, 8) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(network, currency, address)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallets_network ON wallets(network);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(type);
CREATE INDEX IF NOT EXISTS idx_wallets_is_active ON wallets(is_active);

-- Create updated_at trigger
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
CREATE POLICY "Service role full access" ON wallets
  FOR ALL
  USING (true)
  WITH CHECK (true);




