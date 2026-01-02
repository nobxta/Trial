-- DEPRECATED: merged into 000_final_schema.sql
-- Add payout_mode setting to exchange_settings
-- Default: 'manual' (safest mode)
INSERT INTO exchange_settings (key, value)
VALUES ('payout_mode', '{"mode": "manual"}'::jsonb)
ON CONFLICT (key) DO NOTHING;


