-- DEPRECATED: merged into 000_final_schema.sql
-- Create exchange_settings table for global exchange settings
CREATE TABLE IF NOT EXISTS exchange_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exchange_settings_key ON exchange_settings(key);

-- Create updated_at trigger
CREATE TRIGGER update_exchange_settings_updated_at
  BEFORE UPDATE ON exchange_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE exchange_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
CREATE POLICY "Service role full access" ON exchange_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);




