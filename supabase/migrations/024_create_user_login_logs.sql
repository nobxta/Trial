-- DEPRECATED: merged into 000_final_schema.sql
-- Create user_login_logs table for tracking user login activity
CREATE TABLE IF NOT EXISTS user_login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  failure_reason TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_login_at ON user_login_logs(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_ip_address ON user_login_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id_login_at ON user_login_logs(user_id, login_at DESC);

-- Enable Row Level Security
ALTER TABLE user_login_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
CREATE POLICY "Service role full access" ON user_login_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);




