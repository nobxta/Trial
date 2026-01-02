-- DEPRECATED: merged into 000_final_schema.sql
-- Rename last_updated to updated_at to match trigger function
-- This migration fixes the column name mismatch

-- Drop the old index if it exists
DROP INDEX IF EXISTS idx_crypto_prices_last_updated;

-- Rename the column
ALTER TABLE crypto_prices RENAME COLUMN last_updated TO updated_at;

-- Recreate the index with the new name
CREATE INDEX IF NOT EXISTS idx_crypto_prices_updated_at ON crypto_prices(updated_at);




