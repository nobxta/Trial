-- DEPRECATED: merged into 000_final_schema.sql
-- Create email_queue table for database-backed email queue
-- Minimal implementation: no Redis, no BullMQ, just PostgreSQL

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0 NOT NULL,
  last_error TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index on status for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);

-- Index on scheduled_at for efficient scheduling queries
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_at ON email_queue(scheduled_at);

-- Composite index for queue processing queries (status + scheduled_at)
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled ON email_queue(status, scheduled_at);

-- Comments for documentation
COMMENT ON TABLE email_queue IS 'Database-backed email queue. Emails are queued here and processed by cron job.';
COMMENT ON COLUMN email_queue.status IS 'pending: waiting to be sent, sent: successfully sent, failed: permanently failed after max attempts';
COMMENT ON COLUMN email_queue.attempts IS 'Number of send attempts (max 3 before marking as failed)';
COMMENT ON COLUMN email_queue.scheduled_at IS 'When this email should be processed (used for retry delays)';

