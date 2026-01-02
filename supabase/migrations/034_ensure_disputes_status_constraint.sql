-- Ensure disputes status constraint includes all valid values
-- This migration forcefully updates the constraint to match the application requirements

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
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'disputes'
      AND tc.constraint_type = 'CHECK'
      AND ccu.column_name = 'status'
  LOOP
    EXECUTE 'ALTER TABLE disputes DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_record.constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_record.constraint_name;
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping constraints: %', SQLERRM;
END $$;

-- Drop the named constraint if it exists
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_status_check;

-- Add the correct constraint with all valid status values
ALTER TABLE disputes 
ADD CONSTRAINT disputes_status_check 
CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'waiting', 'deleted'));

-- Verify the constraint was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'disputes_status_check' 
      AND table_name = 'disputes'
  ) THEN
    RAISE NOTICE 'Constraint disputes_status_check created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create constraint disputes_status_check';
  END IF;
END $$;

