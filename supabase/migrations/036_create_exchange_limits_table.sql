-- Create exchange_limits table for caching NOWPayments min/max limits
CREATE TABLE IF NOT EXISTS exchange_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_from TEXT NOT NULL,
  currency_to TEXT NOT NULL,
  is_fixed_rate BOOLEAN NOT NULL DEFAULT FALSE,
  min_amount DECIMAL(20, 8) NOT NULL,
  max_amount DECIMAL(20, 8),
  min_amount_fiat DECIMAL(20, 8),
  max_amount_fiat DECIMAL(20, 8),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(currency_from, currency_to, is_fixed_rate)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_exchange_limits_currency_from ON exchange_limits(currency_from);
CREATE INDEX IF NOT EXISTS idx_exchange_limits_currency_to ON exchange_limits(currency_to);
CREATE INDEX IF NOT EXISTS idx_exchange_limits_pair ON exchange_limits(currency_from, currency_to);
CREATE INDEX IF NOT EXISTS idx_exchange_limits_updated_at ON exchange_limits(updated_at);

-- Create updated_at trigger
CREATE TRIGGER update_exchange_limits_updated_at
  BEFORE UPDATE ON exchange_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE exchange_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
CREATE POLICY "Service role full access" ON exchange_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE exchange_limits IS 'Cache for NOWPayments exchange min/max limits, updated every 10 minutes';
COMMENT ON COLUMN exchange_limits.currency_from IS 'NOWPayments currency code (e.g., btc, usdterc20)';
COMMENT ON COLUMN exchange_limits.currency_to IS 'NOWPayments currency code (e.g., eth, usdttrc20)';
COMMENT ON COLUMN exchange_limits.is_fixed_rate IS 'Whether limits are for fixed-rate exchange';
COMMENT ON COLUMN exchange_limits.min_amount IS 'Minimum exchange amount';
COMMENT ON COLUMN exchange_limits.max_amount IS 'Maximum exchange amount (may be null)';
COMMENT ON COLUMN exchange_limits.updated_at IS 'Last time limits were fetched from NOWPayments API';

