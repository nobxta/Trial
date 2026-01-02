-- DEPRECATED: merged into 000_final_schema.sql
-- Create admin_action_logs table for audit trail
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_id ON admin_action_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action_type ON admin_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_resource_type ON admin_action_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_resource_id ON admin_action_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at ON admin_action_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
CREATE POLICY "Service role full access" ON admin_action_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);




