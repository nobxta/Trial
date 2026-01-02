-- DEPRECATED: merged into 000_final_schema.sql
-- Enhance admin_action_logs to include previous_state and new_state for unified event log
ALTER TABLE admin_action_logs 
  ADD COLUMN IF NOT EXISTS previous_state JSONB,
  ADD COLUMN IF NOT EXISTS new_state JSONB,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id TEXT;

-- Create indexes for entity-centric queries
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_entity ON admin_action_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_entity_id ON admin_action_logs(entity_id);

-- Update existing records to set entity_type and entity_id from resource_type and resource_id
UPDATE admin_action_logs 
SET entity_type = resource_type, 
    entity_id = resource_id 
WHERE entity_type IS NULL;




