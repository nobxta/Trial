-- DEPRECATED: merged into 000_final_schema.sql
-- Add maintenance mode to exchange_settings
INSERT INTO exchange_settings (key, value, updated_at)
VALUES ('maintenance_mode', '{"enabled": false}', NOW())
ON CONFLICT (key) DO NOTHING;


