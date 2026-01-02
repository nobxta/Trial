-- Allow NULL user_id in orders table for anonymous orders
-- This removes the requirement to create fake anonymous users

-- Drop NOT NULL constraint on user_id
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- Foreign key constraint already allows NULL values (PostgreSQL behavior)
-- NULL values in foreign keys don't cascade on delete, which is correct for anonymous orders

-- Add comment
COMMENT ON COLUMN orders.user_id IS 'User ID for logged-in users, NULL for anonymous orders';

