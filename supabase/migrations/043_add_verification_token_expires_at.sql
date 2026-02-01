-- Add expiration to email verification tokens (security: reject expired links).
-- Tokens are single-use: cleared on successful verification.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN users.verification_token_expires_at IS 'When the verification token expires. Null if no token or token has no expiry (legacy).';
