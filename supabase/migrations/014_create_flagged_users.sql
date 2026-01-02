-- DEPRECATED: merged into 000_final_schema.sql
-- Create flagged_users table for user flagging system
CREATE TABLE IF NOT EXISTS flagged_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  flagged_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  metadata JSONB,
  flagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES admin_users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_flagged_users_user_id ON flagged_users(user_id);
CREATE INDEX IF NOT EXISTS idx_flagged_users_flagged_by ON flagged_users(flagged_by);
CREATE INDEX IF NOT EXISTS idx_flagged_users_flagged_at ON flagged_users(flagged_at DESC);
CREATE INDEX IF NOT EXISTS idx_flagged_users_resolved_at ON flagged_users(resolved_at);

-- Enable Row Level Security
ALTER TABLE flagged_users ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
CREATE POLICY "Service role full access" ON flagged_users
  FOR ALL
  USING (true)
  WITH CHECK (true);




