-- DEPRECATED: merged into 000_final_schema.sql
-- Extend disputes table for live chat functionality
ALTER TABLE disputes 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'order_dispute' CHECK (type IN ('order_dispute', 'live_chat')),
ADD COLUMN IF NOT EXISTS chat_id UUID UNIQUE,
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

-- Update status constraint to include new values (waiting, deleted)
-- Drop all existing CHECK constraints on status column (they may have system-generated names)
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  -- Find and drop all CHECK constraints related to status column
  FOR constraint_record IN
    SELECT constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'disputes'
      AND tc.constraint_type = 'CHECK'
      AND ccu.column_name = 'status'
  LOOP
    EXECUTE 'ALTER TABLE disputes DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_record.constraint_name);
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN
    -- Continue even if there are errors
    NULL;
END $$;

-- Also try dropping the named constraint if it exists
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_status_check;

-- Add new constraint with all possible status values
ALTER TABLE disputes 
ADD CONSTRAINT disputes_status_check 
CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'waiting', 'deleted'));

-- Create index for chat_id lookups
CREATE INDEX IF NOT EXISTS idx_disputes_chat_id ON disputes(chat_id);
CREATE INDEX IF NOT EXISTS idx_disputes_type_status ON disputes(type, status);
CREATE INDEX IF NOT EXISTS idx_disputes_last_message_at ON disputes(last_message_at DESC);

-- Generate chat_id for existing disputes if null (only if table has rows)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM disputes WHERE chat_id IS NULL) THEN
    UPDATE disputes 
    SET chat_id = gen_random_uuid() 
    WHERE chat_id IS NULL;
  END IF;
END $$;


