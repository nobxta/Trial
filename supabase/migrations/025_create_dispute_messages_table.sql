-- DEPRECATED: merged into 000_final_schema.sql
-- Create dispute_messages table for chat messages
CREATE TABLE IF NOT EXISTS dispute_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'admin', 'system')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    
    CONSTRAINT valid_message_length CHECK (char_length(message) > 0 AND char_length(message) <= 5000)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_read_at ON dispute_messages(dispute_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created_at ON dispute_messages(created_at DESC);

-- Add RLS policies (if RLS is enabled)
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages for their own chats (via chat_id lookup)
-- Policy: Admins can read all messages
-- Note: These policies should be adjusted based on your auth setup


