-- Admin setting: Enable/disable order-page polling (GET /api/order/[id] syncing from provider).
-- When disabled, the site relies purely on webhooks for status updates. No redeploy required.
INSERT INTO exchange_settings (key, value)
VALUES ('order_polling_enabled', '{"enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;
