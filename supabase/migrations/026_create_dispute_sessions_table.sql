-- DEPRECATED: merged into 000_final_schema.sql
-- Create dispute_sessions table for tracking chat continuity
CREATE TABLE IF NOT EXISTS dispute_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES disputes(chat_id) ON DELETE CASCADE,
    ip_hash TEXT NOT NULL, -- SHA256 hash of IP address
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dispute_sessions_chat_id ON dispute_sessions(chat_id);
CREATE INDEX IF NOT EXISTS idx_dispute_sessions_ip_hash ON dispute_sessions(ip_hash);
CREATE INDEX IF NOT EXISTS idx_dispute_sessions_last_active ON dispute_sessions(last_active_at DESC);

-- Add RLS policies
ALTER TABLE dispute_sessions ENABLE ROW LEVEL SECURITY;




