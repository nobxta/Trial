-- DEPRECATED: merged into 000_final_schema.sql
-- Create email_settings table for admin email configuration
-- Simple key-value store for email-related settings

CREATE TABLE IF NOT EXISTS email_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Insert default settings
INSERT INTO email_settings (key, value) VALUES
  ('sender_email', 'noreply@mintmove.com'),
  ('sender_name', 'MintMove'),
  ('order_notifications_enabled', 'true'),
  ('verification_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE email_settings IS 'Admin-configurable email settings. Simple key-value store.';
COMMENT ON COLUMN email_settings.key IS 'Setting key (e.g., sender_email, sender_name, order_notifications_enabled)';
COMMENT ON COLUMN email_settings.value IS 'Setting value (string, parse as needed)';

