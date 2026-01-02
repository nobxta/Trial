-- DEPRECATED: merged into 000_final_schema.sql
-- Create crypto_prices table for server-side price caching
CREATE TABLE IF NOT EXISTS crypto_prices (
  coin_id TEXT PRIMARY KEY, -- CoinGecko ID (e.g., "bitcoin", "ethereum")
  symbol TEXT NOT NULL, -- Crypto symbol (e.g., "BTC", "ETH")
  price_usd NUMERIC(20, 8) NOT NULL DEFAULT 0, -- Price in USD (up to 20 digits, 8 decimal places)
  price_change_24h NUMERIC(10, 4), -- 24h price change percentage
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_crypto_prices_symbol ON crypto_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_crypto_prices_last_updated ON crypto_prices(last_updated);

-- Create updated_at trigger
CREATE TRIGGER update_crypto_prices_updated_at
  BEFORE UPDATE ON crypto_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional, but good practice)
ALTER TABLE crypto_prices ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY "Service role full access" ON crypto_prices
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: Allow public read access (prices are public data)
CREATE POLICY "Public read access" ON crypto_prices
  FOR SELECT
  USING (true);


