-- DEPRECATED: merged into 000_final_schema.sql
-- Add blocked field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES admin_users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason TEXT;

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_blocked ON users(blocked);


