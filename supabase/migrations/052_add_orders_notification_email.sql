-- Add optional notification email for order status updates (guest orders / order-page subscribe)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS notification_email TEXT;

COMMENT ON COLUMN orders.notification_email IS 'Optional email for order status notifications (e.g. from order page subscribe). Used when user_id is NULL or in addition to user account email.';
