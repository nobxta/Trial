-- DEPRECATED: merged into 000_final_schema.sql
-- Add locked field to orders table for admin lock functionality
ALTER TABLE orders ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE;

-- Create index for locked orders
CREATE INDEX IF NOT EXISTS idx_orders_locked ON orders(locked);




