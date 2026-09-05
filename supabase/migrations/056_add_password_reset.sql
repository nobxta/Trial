-- Password reset flow + session invalidation
--
-- reset_token_hash        : SHA-256 hash of the emailed reset token. The raw token is
--                           NEVER stored, so a database leak cannot be used to reset accounts.
-- reset_token_expires_at  : Single-use token expiry (1 hour from request).
-- reset_requested_at      : Timestamp of the last reset request, used for the per-email
--                           cooldown that prevents inbox flooding.
-- password_changed_at     : Set whenever the password changes (reset or account change).
--                           Sessions whose JWT was issued before this are rejected, which
--                           logs out every other device after a password change.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reset_requested_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_reset_token_hash ON users(reset_token_hash);

COMMENT ON COLUMN users.reset_token_hash IS 'SHA-256 hash of the password reset token. Raw token is never stored.';
COMMENT ON COLUMN users.reset_token_expires_at IS 'When the reset token expires. Cleared on use (single-use).';
COMMENT ON COLUMN users.reset_requested_at IS 'Last reset request time, used for the per-email cooldown.';
COMMENT ON COLUMN users.password_changed_at IS 'Last password change. JWTs issued before this are treated as stale.';
