-- Create blocked_ips table for IP blocking functionality
CREATE TABLE IF NOT EXISTS blocked_ips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  ip_hash TEXT, -- Hashed version for privacy
  reason TEXT NOT NULL,
  blocked_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL means permanent block
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB, -- Additional info like country, user_agent, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_hash ON blocked_ips(ip_hash);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_is_active ON blocked_ips(is_active);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires_at ON blocked_ips(expires_at);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_blocked_at ON blocked_ips(blocked_at DESC);

-- Enable Row Level Security
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
CREATE POLICY "Service role full access" ON blocked_ips
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_blocked_ips_updated_at
  BEFORE UPDATE ON blocked_ips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE blocked_ips IS 'IP addresses blocked from accessing the website';
COMMENT ON COLUMN blocked_ips.ip_address IS 'The IP address to block (can be IPv4 or IPv6)';
COMMENT ON COLUMN blocked_ips.ip_hash IS 'SHA256 hash of IP for privacy/security';
COMMENT ON COLUMN blocked_ips.expires_at IS 'When the block expires (NULL = permanent)';
COMMENT ON COLUMN blocked_ips.is_active IS 'Whether the block is currently active';



