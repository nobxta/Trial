-- DEPRECATED: merged into 000_final_schema.sql
-- Add user preferences columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS affiliate_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS api_key TEXT;

-- Create index on affiliate_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_affiliate_code ON users(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);

-- Generate affiliate codes for existing users (if any)
UPDATE users 
SET affiliate_code = 'AFF' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8))
WHERE affiliate_code IS NULL;




