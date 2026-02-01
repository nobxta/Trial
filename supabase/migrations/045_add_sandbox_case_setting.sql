-- Sandbox case: admin-controlled scenario when payment mode is sandbox
-- (success, failed, expired, partially_paid). Replaces NOWPAYMENTS_SANDBOX_CASE env.
INSERT INTO exchange_settings (key, value)
VALUES ('sandbox_case', '{"case": "success"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
