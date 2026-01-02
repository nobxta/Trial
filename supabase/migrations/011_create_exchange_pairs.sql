-- DEPRECATED: merged into 000_final_schema.sql
-- Create exchange_pairs table for exchange engine configuration
CREATE TABLE IF NOT EXISTS exchange_pairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency TEXT NOT NULL,
  from_network TEXT,
  to_currency TEXT NOT NULL,
  to_network TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  min_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
  max_amount DECIMAL(20, 8),
  fee_percent DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure unique pairs
  UNIQUE(from_currency, from_network, to_currency, to_network)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exchange_pairs_from_currency ON exchange_pairs(from_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_pairs_to_currency ON exchange_pairs(to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_pairs_enabled ON exchange_pairs(enabled);

-- Create updated_at trigger
CREATE TRIGGER update_exchange_pairs_updated_at
  BEFORE UPDATE ON exchange_pairs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE exchange_pairs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
CREATE POLICY "Service role full access" ON exchange_pairs
  FOR ALL
  USING (true)
  WITH CHECK (true);




