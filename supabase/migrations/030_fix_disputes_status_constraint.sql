-- DEPRECATED: merged into 000_final_schema.sql
-- Fix disputes status constraint to include all valid status values
-- This migration ensures the constraint is properly updated

-- Drop all existing CHECK constraints on the status column
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

-- Add the new constraint with all valid status values
DO $$
BEGIN
  -- Drop if exists (in case it was created with a specific name)
  ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_status_check;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

ALTER TABLE disputes 
ADD CONSTRAINT disputes_status_check 
CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'waiting', 'deleted'));




