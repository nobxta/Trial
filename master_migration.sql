-- =============================================================================
-- MASTER MIGRATION — MintMove
-- =============================================================================
-- Single idempotent migration for fresh or existing databases.
-- Safe to run multiple times. Order: extensions → enums → tables → constraints
-- → indexes → triggers → functions → RLS/policies → seed data.
--
-- CONFLICTS / NOTES:
-- - 033_create_payouts_table.sql defined a different payouts schema (user_id,
--   amount, currency — user withdrawal requests). This master keeps the
--   order-based payouts table from 021/000. If user payout requests are needed,
--   create a separate table (e.g. user_payout_requests).
-- - Duplicate migration prefixes (024, 025, 026, 030): all applied in logical
--   order; disputes status constraint applied once at end.
-- - crypto_prices: created with updated_at; optional rename from last_updated
--   applied only if that column exists (legacy 018).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- -----------------------------------------------------------------------------
-- (None required for this schema; add here if needed, e.g. CREATE EXTENSION IF NOT EXISTS "uuid-ossp";)

-- -----------------------------------------------------------------------------
-- 2. CORE FUNCTIONS (no table dependencies)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. TABLES (dependency order)
-- -----------------------------------------------------------------------------

-- 3.1 Admin users (referenced by users.blocked_by, orders, etc.)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'operator', 'super_admin')),
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.2 Users (depends on admin_users for blocked_by)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  verification_token_expires_at TIMESTAMP WITH TIME ZONE,
  notifications_enabled BOOLEAN DEFAULT FALSE,
  affiliate_code TEXT UNIQUE,
  api_key TEXT,
  blocked BOOLEAN DEFAULT FALSE,
  blocked_at TIMESTAMP WITH TIME ZONE,
  blocked_by UUID REFERENCES admin_users(id),
  block_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.3 Addresses (depends on users)
CREATE TABLE IF NOT EXISTS addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  currency TEXT NOT NULL,
  network TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.4 Affiliates (depends on users)
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  total_earnings DECIMAL(20, 8) DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  commission_rate DECIMAL(5, 4) DEFAULT 0.05,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.5 Orders (depends on users, admin_users; user_id nullable per 039)
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT UNIQUE NOT NULL,
  payment_id TEXT,
  purchase_id TEXT,
  payment_mode TEXT CHECK (payment_mode IN ('live', 'sandbox')),
  sandbox_case TEXT CHECK (sandbox_case IN ('success', 'failed', 'expired', 'partially_paid')),
  status TEXT NOT NULL DEFAULT 'pending',
  internal_status TEXT,
  user_status TEXT,
  provider_status TEXT,
  status_source TEXT,
  status_updated_by UUID REFERENCES admin_users(id),
  from_currency TEXT NOT NULL,
  from_amount DECIMAL(20, 8) NOT NULL,
  from_network TEXT,
  from_address TEXT,
  to_currency TEXT NOT NULL,
  to_amount DECIMAL(20, 8) NOT NULL,
  to_network TEXT,
  to_address TEXT,
  locked BOOLEAN DEFAULT FALSE,
  provider_rate DECIMAL(20, 8),
  expected_receive DECIMAL(20, 8),
  rate_timestamp TIMESTAMP WITH TIME ZONE,
  rate_deviation_percent DECIMAL(5, 2),
  payin_hash TEXT,
  payout_hash TEXT,
  payout_hash_entered_by UUID REFERENCES admin_users(id),
  payout_hash_entered_at TIMESTAMP WITH TIME ZONE,
  manual_review_required BOOLEAN DEFAULT FALSE,
  manual_review_reason TEXT,
  manual_review_assigned_to UUID REFERENCES admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.6 Referrals (depends on affiliates, users, orders)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  commission_amount DECIMAL(20, 8),
  status TEXT NOT NULL DEFAULT 'pending',
  clicked_at TIMESTAMP WITH TIME ZONE,
  signed_up_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.7 Admin action logs (depends on admin_users)
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  previous_state JSONB,
  new_state JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.8 Exchange settings (depends on admin_users)
CREATE TABLE IF NOT EXISTS exchange_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id)
);

-- 3.9 Admin notes (depends on orders, users, admin_users)
CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT REFERENCES orders(order_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK ((order_id IS NOT NULL) OR (user_id IS NOT NULL))
);

-- 3.10 Flagged users (depends on users, admin_users)
CREATE TABLE IF NOT EXISTS flagged_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  flagged_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  metadata JSONB,
  flagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES admin_users(id)
);

-- 3.11 Exchange pairs (independent)
CREATE TABLE IF NOT EXISTS exchange_pairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency TEXT NOT NULL,
  from_network TEXT,
  to_currency TEXT NOT NULL,
  to_network TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  min_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
  max_amount DECIMAL(20, 8),
  fee_percent DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_currency, from_network, to_currency, to_network)
);

-- 3.12 Webhook idempotency (independent)
CREATE TABLE IF NOT EXISTS webhook_idempotency (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  order_id TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(payment_id, payment_status)
);

-- 3.13 Order status history (depends on orders)
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  payment_status TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.14 Crypto prices (independent; column is updated_at; legacy rename below if needed)
CREATE TABLE IF NOT EXISTS crypto_prices (
  coin_id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  price_usd NUMERIC(20, 8) NOT NULL DEFAULT 0,
  price_change_24h NUMERIC(10, 4),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3.15 Disputes (depends on orders, users, admin_users; status constraint applied in section 7)
CREATE TABLE IF NOT EXISTS disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT REFERENCES orders(order_id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'waiting', 'deleted')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  type TEXT DEFAULT 'order_dispute' CHECK (type IN ('order_dispute', 'live_chat')),
  chat_id UUID UNIQUE,
  user_email TEXT,
  last_message_at TIMESTAMPTZ,
  refund_required BOOLEAN DEFAULT FALSE,
  refund_amount DECIMAL(20, 8),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.16 Wallets (independent)
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  network TEXT NOT NULL,
  currency TEXT NOT NULL,
  address TEXT NOT NULL,
  label TEXT,
  type TEXT NOT NULL DEFAULT 'hot' CHECK (type IN ('hot', 'cold', 'payout')),
  balance DECIMAL(20, 8) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(network, currency, address)
);

-- 3.17 Payouts — order-based (021/000); see header re 033
CREATE TABLE IF NOT EXISTS payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT REFERENCES orders(order_id) ON DELETE SET NULL,
  wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  network TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  recipient_address TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  initiated_by UUID REFERENCES admin_users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.18 User login logs (depends on users)
CREATE TABLE IF NOT EXISTS user_login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  failure_reason TEXT
);

-- 3.19 Dispute messages (depends on disputes)
CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'admin', 'system')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  CONSTRAINT valid_message_length CHECK (char_length(message) > 0 AND char_length(message) <= 5000)
);

-- 3.20 User activity logs (depends on users)
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.21 Dispute sessions (depends on disputes)
CREATE TABLE IF NOT EXISTS dispute_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES disputes(chat_id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.22 Email queue (independent)
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0 NOT NULL,
  last_error TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3.23 Email settings (independent)
CREATE TABLE IF NOT EXISTS email_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3.24 Idempotency keys (independent)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(scope, key)
);

-- 3.25 Ledger entries (independent; references order_id, user_id as data only)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT,
  user_id UUID,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  category TEXT NOT NULL,
  amount NUMERIC(20, 8) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3.26 Blocked IPs (depends on admin_users)
CREATE TABLE IF NOT EXISTS blocked_ips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  ip_hash TEXT,
  reason TEXT NOT NULL,
  blocked_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3.27 Exchange limits (independent)
CREATE TABLE IF NOT EXISTS exchange_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_from TEXT NOT NULL,
  currency_to TEXT NOT NULL,
  is_fixed_rate BOOLEAN NOT NULL DEFAULT FALSE,
  min_amount DECIMAL(20, 8) NOT NULL,
  max_amount DECIMAL(20, 8),
  min_amount_fiat DECIMAL(20, 8),
  max_amount_fiat DECIMAL(20, 8),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(currency_from, currency_to, is_fixed_rate)
);

-- 3.28 Webhook orphans (046)
CREATE TABLE IF NOT EXISTS webhook_orphans (
  payment_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload_snapshot JSONB,
  recovered_at TIMESTAMPTZ,
  recovered_order_id TEXT
);

-- 3.29 Cron runs (046)
CREATE TABLE IF NOT EXISTS cron_runs (
  endpoint text PRIMARY KEY,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. ALTER: optional column renames / nullable (idempotent)
-- -----------------------------------------------------------------------------

-- 4.1 Legacy: rename crypto_prices.last_updated → updated_at only if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'crypto_prices' AND column_name = 'last_updated'
  ) THEN
    DROP INDEX IF EXISTS idx_crypto_prices_last_updated;
    ALTER TABLE crypto_prices RENAME COLUMN last_updated TO updated_at;
    CREATE INDEX IF NOT EXISTS idx_crypto_prices_updated_at ON crypto_prices(updated_at);
  END IF;
END $$;

-- 4.2 Allow NULL user_id on orders (039)
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- 4.3 Add columns that may have been added in incremental migrations (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_mode TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS purchase_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sandbox_case TEXT;

-- Add check constraints only if column exists and constraint not present (avoid duplicate constraint names)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_mode') THEN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_mode_check;
    ALTER TABLE orders ADD CONSTRAINT orders_payment_mode_check CHECK (payment_mode IS NULL OR payment_mode IN ('live', 'sandbox'));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'sandbox_case') THEN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_sandbox_case_check;
    ALTER TABLE orders ADD CONSTRAINT orders_sandbox_case_check CHECK (sandbox_case IS NULL OR sandbox_case IN ('success', 'failed', 'expired', 'partially_paid'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. DISPUTES STATUS CONSTRAINT (single source of truth; idempotent)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'disputes'
      AND tc.constraint_type = 'CHECK' AND ccu.column_name = 'status'
  LOOP
    EXECUTE 'ALTER TABLE disputes DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;
  ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_status_check;
  ALTER TABLE disputes ADD CONSTRAINT disputes_status_check
    CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'waiting', 'deleted'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 6. INDEXES (all IF NOT EXISTS)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_affiliate_code ON users(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_users_blocked ON users(blocked);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_default ON addresses(user_id, is_default) WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_locked ON orders(locked);
CREATE INDEX IF NOT EXISTS idx_orders_internal_status ON orders(internal_status);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_status);
CREATE INDEX IF NOT EXISTS idx_orders_manual_review ON orders(manual_review_required) WHERE manual_review_required = TRUE;
CREATE INDEX IF NOT EXISTS idx_orders_status_source ON orders(status_source);
CREATE INDEX IF NOT EXISTS idx_orders_payment_mode ON orders(payment_mode);
CREATE INDEX IF NOT EXISTS idx_orders_purchase_id ON orders(purchase_id);

CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);

CREATE INDEX IF NOT EXISTS idx_referrals_affiliate_id ON referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_order_id ON referrals(order_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_payment_id ON webhook_idempotency(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_order_id ON webhook_idempotency(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_processed_at ON webhook_idempotency(processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_status ON order_status_history(status);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_id ON admin_action_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action_type ON admin_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_resource_type ON admin_action_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_resource_id ON admin_action_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at ON admin_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_entity ON admin_action_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_entity_id ON admin_action_logs(entity_id);

CREATE INDEX IF NOT EXISTS idx_exchange_settings_key ON exchange_settings(key);

CREATE INDEX IF NOT EXISTS idx_admin_notes_order_id ON admin_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_user_id ON admin_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_admin_id ON admin_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_created_at ON admin_notes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_flagged_users_user_id ON flagged_users(user_id);
CREATE INDEX IF NOT EXISTS idx_flagged_users_flagged_by ON flagged_users(flagged_by);
CREATE INDEX IF NOT EXISTS idx_flagged_users_flagged_at ON flagged_users(flagged_at DESC);
CREATE INDEX IF NOT EXISTS idx_flagged_users_resolved_at ON flagged_users(resolved_at);

CREATE INDEX IF NOT EXISTS idx_exchange_pairs_from_currency ON exchange_pairs(from_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_pairs_to_currency ON exchange_pairs(to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_pairs_enabled ON exchange_pairs(enabled);

CREATE INDEX IF NOT EXISTS idx_crypto_prices_symbol ON crypto_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_crypto_prices_updated_at ON crypto_prices(updated_at);

CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_chat_id ON disputes(chat_id);
CREATE INDEX IF NOT EXISTS idx_disputes_type_status ON disputes(type, status);
CREATE INDEX IF NOT EXISTS idx_disputes_last_message_at ON disputes(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallets_network ON wallets(network);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(type);
CREATE INDEX IF NOT EXISTS idx_wallets_is_active ON wallets(is_active);

CREATE INDEX IF NOT EXISTS idx_payouts_order_id ON payouts(order_id);
CREATE INDEX IF NOT EXISTS idx_payouts_wallet_id ON payouts(wallet_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_tx_hash ON payouts(tx_hash);

CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_login_at ON user_login_logs(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_ip_address ON user_login_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id_login_at ON user_login_logs(user_id, login_at DESC);

CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_read_at ON dispute_messages(dispute_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created_at ON dispute_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id_created_at ON user_activity_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dispute_sessions_chat_id ON dispute_sessions(chat_id);
CREATE INDEX IF NOT EXISTS idx_dispute_sessions_ip_hash ON dispute_sessions(ip_hash);
CREATE INDEX IF NOT EXISTS idx_dispute_sessions_last_active ON dispute_sessions(last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_at ON email_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled ON email_queue(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_scope ON idempotency_keys(scope);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_scope_key ON idempotency_keys(scope, key);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_order_id ON ledger_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_currency ON ledger_entries(user_id, currency);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_hash ON blocked_ips(ip_hash);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_is_active ON blocked_ips(is_active);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires_at ON blocked_ips(expires_at);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_blocked_at ON blocked_ips(blocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_limits_currency_from ON exchange_limits(currency_from);
CREATE INDEX IF NOT EXISTS idx_exchange_limits_currency_to ON exchange_limits(currency_to);
CREATE INDEX IF NOT EXISTS idx_exchange_limits_pair ON exchange_limits(currency_from, currency_to);
CREATE INDEX IF NOT EXISTS idx_exchange_limits_updated_at ON exchange_limits(updated_at);

CREATE INDEX IF NOT EXISTS idx_webhook_orphans_created_at ON webhook_orphans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_orphans_recovered_at ON webhook_orphans(recovered_at) WHERE recovered_at IS NULL;

-- -----------------------------------------------------------------------------
-- 6b. TRIGGER FUNCTIONS (must exist before triggers that reference them)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_dispute_last_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE disputes SET last_message_at = NEW.created_at WHERE id = NEW.dispute_id;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE dispute_sessions SET last_active_at = NOW() WHERE chat_id = NEW.chat_id;
  RETURN NEW;
END; $$;

-- -----------------------------------------------------------------------------
-- 7. TRIGGERS (DROP IF EXISTS then CREATE)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_addresses_updated_at ON addresses;
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_affiliates_updated_at ON affiliates;
CREATE TRIGGER update_affiliates_updated_at BEFORE UPDATE ON affiliates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exchange_pairs_updated_at ON exchange_pairs;
CREATE TRIGGER update_exchange_pairs_updated_at BEFORE UPDATE ON exchange_pairs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exchange_settings_updated_at ON exchange_settings;
CREATE TRIGGER update_exchange_settings_updated_at BEFORE UPDATE ON exchange_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_notes_updated_at ON admin_notes;
CREATE TRIGGER update_admin_notes_updated_at BEFORE UPDATE ON admin_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crypto_prices_updated_at ON crypto_prices;
CREATE TRIGGER update_crypto_prices_updated_at BEFORE UPDATE ON crypto_prices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_disputes_updated_at ON disputes;
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payouts_updated_at ON payouts;
CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blocked_ips_updated_at ON blocked_ips;
CREATE TRIGGER update_blocked_ips_updated_at BEFORE UPDATE ON blocked_ips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exchange_limits_updated_at ON exchange_limits;
CREATE TRIGGER update_exchange_limits_updated_at BEFORE UPDATE ON exchange_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Chat / dispute triggers (functions created in section 8)
DROP TRIGGER IF EXISTS trigger_update_dispute_last_message ON dispute_messages;
CREATE TRIGGER trigger_update_dispute_last_message AFTER INSERT ON dispute_messages FOR EACH ROW EXECUTE FUNCTION update_dispute_last_message();

DROP TRIGGER IF EXISTS trigger_update_session_last_active ON dispute_sessions;
CREATE TRIGGER trigger_update_session_last_active AFTER INSERT ON dispute_sessions FOR EACH ROW EXECUTE FUNCTION update_session_last_active();

-- -----------------------------------------------------------------------------
-- 8. FUNCTIONS (table-dependent; CREATE OR REPLACE)
-- -----------------------------------------------------------------------------
-- update_dispute_last_message and update_session_last_active are in section 6b (before triggers).
CREATE OR REPLACE FUNCTION try_claim_idempotency(p_scope text, p_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO idempotency_keys (scope, key) VALUES (p_scope, p_key)
  ON CONFLICT (scope, key) DO NOTHING RETURNING id INTO v_id;
  RETURN v_id IS NOT NULL;
END; $$;

CREATE OR REPLACE FUNCTION record_order_completion_atomic(
  p_order_id text, p_user_id uuid, p_to_amount numeric, p_to_currency text,
  p_from_amount numeric, p_from_currency text, p_fee_percent numeric DEFAULT 0.01
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_scope text := 'ledger_entry';
  v_key text := 'order:' || p_order_id || ':ledger';
  v_id uuid;
  v_fee_amount numeric;
BEGIN
  INSERT INTO idempotency_keys (scope, key) VALUES (v_scope, v_key)
  ON CONFLICT (scope, key) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN true; END IF;
  v_fee_amount := p_from_amount * p_fee_percent;
  INSERT INTO ledger_entries (order_id, user_id, type, category, amount, currency)
  VALUES (p_order_id, p_user_id, 'credit', 'payout', p_to_amount, upper(p_to_currency));
  IF v_fee_amount > 0 THEN
    INSERT INTO ledger_entries (order_id, user_id, type, category, amount, currency)
    VALUES (p_order_id, NULL, 'credit', 'fee', v_fee_amount, upper(p_from_currency));
  END IF;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION create_order_with_history(p_order jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_row orders%ROWTYPE; v_order_id text;
BEGIN
  INSERT INTO orders (
    user_id, order_id, payment_id, purchase_id, payment_mode, sandbox_case,
    internal_status, user_status, status, status_source,
    from_currency, from_amount, from_network, from_address,
    to_currency, to_amount, to_network, to_address,
    provider_rate, expected_receive, rate_timestamp, rate_deviation_percent
  ) VALUES (
    (p_order->>'user_id')::uuid, p_order->>'order_id', NULLIF(TRIM(p_order->>'payment_id'), ''), NULLIF(TRIM(p_order->>'purchase_id'), ''),
    NULLIF(TRIM(p_order->>'payment_mode'), ''), NULLIF(TRIM(p_order->>'sandbox_case'), ''),
    COALESCE(NULLIF(TRIM(p_order->>'internal_status'), ''), 'NEW'), COALESCE(NULLIF(TRIM(p_order->>'user_status'), ''), 'Waiting for payment'),
    COALESCE(NULLIF(TRIM(p_order->>'status'), ''), 'NEW'), COALESCE(NULLIF(TRIM(p_order->>'status_source'), ''), 'system'),
    p_order->>'from_currency', (p_order->>'from_amount')::decimal, NULLIF(TRIM(p_order->>'from_network'), ''), NULLIF(TRIM(p_order->>'from_address'), ''),
    p_order->>'to_currency', (p_order->>'to_amount')::decimal, NULLIF(TRIM(p_order->>'to_network'), ''), NULLIF(TRIM(p_order->>'to_address'), ''),
    (p_order->>'provider_rate')::decimal, (p_order->>'expected_receive')::decimal, (p_order->>'rate_timestamp')::timestamptz, (p_order->>'rate_deviation_percent')::decimal
  ) RETURNING * INTO v_row;
  v_order_id := v_row.order_id;
  INSERT INTO order_status_history (order_id, status, source) VALUES (v_order_id, v_row.internal_status, COALESCE(v_row.status_source, 'system'));
  RETURN to_jsonb(v_row);
END; $$;

CREATE OR REPLACE FUNCTION process_webhook_status_update(p_params jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid; v_row orders%ROWTYPE; v_old_internal_status text;
BEGIN
  INSERT INTO webhook_idempotency (payment_id, payment_status, order_id)
  VALUES (p_params->>'payment_id', p_params->>'payment_status', p_params->>'order_id')
  ON CONFLICT (payment_id, payment_status) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN jsonb_build_object('already_processed', true); END IF;
  SELECT internal_status INTO v_old_internal_status FROM orders WHERE order_id = p_params->>'order_id';
  IF v_old_internal_status IS NULL THEN RAISE EXCEPTION 'order_not_found: order_id %', p_params->>'order_id'; END IF;
  IF v_old_internal_status IN ('DONE', 'FAILED', 'EXPIRED') THEN
    SELECT * INTO v_row FROM orders WHERE order_id = p_params->>'order_id';
    RETURN jsonb_build_object('already_processed', false, 'order', to_jsonb(v_row));
  END IF;
  UPDATE orders SET
    internal_status = COALESCE(NULLIF(TRIM(p_params->>'internal_status'), ''), internal_status),
    user_status = COALESCE(NULLIF(TRIM(p_params->>'user_status'), ''), user_status),
    status = COALESCE(NULLIF(TRIM(p_params->>'internal_status'), ''), status),
    status_source = COALESCE(NULLIF(TRIM(p_params->>'status_source'), ''), 'webhook'),
    provider_status = NULLIF(TRIM(p_params->>'provider_status'), ''),
    from_address = COALESCE(NULLIF(TRIM(p_params->>'from_address'), ''), from_address),
    payin_hash = COALESCE(NULLIF(TRIM(p_params->>'payin_hash'), ''), payin_hash),
    payout_hash = COALESCE(NULLIF(TRIM(p_params->>'payout_hash'), ''), payout_hash),
    payout_hash_entered_at = CASE WHEN NULLIF(TRIM(p_params->>'payout_hash'), '') IS NOT NULL THEN NOW() ELSE payout_hash_entered_at END,
    updated_at = NOW()
  WHERE order_id = p_params->>'order_id' RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'order update failed: order_id %', p_params->>'order_id'; END IF;
  IF v_old_internal_status IS DISTINCT FROM (p_params->>'internal_status') THEN
    INSERT INTO order_status_history (order_id, status, source, payment_status, metadata)
    VALUES (p_params->>'order_id', p_params->>'internal_status', 'webhook', NULLIF(TRIM(p_params->>'payment_status'), ''),
      jsonb_build_object('payin_hash', NULLIF(TRIM(p_params->>'payin_hash'), ''), 'payout_hash', NULLIF(TRIM(p_params->>'payout_hash'), '')));
  END IF;
  RETURN jsonb_build_object('already_processed', false, 'order', to_jsonb(v_row));
END; $$;

-- -----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY & POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON users;
CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON addresses;
CREATE POLICY "Service role full access" ON addresses FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON orders;
CREATE POLICY "Service role full access" ON orders FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON affiliates;
CREATE POLICY "Service role full access" ON affiliates FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON referrals;
CREATE POLICY "Service role full access" ON referrals FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON webhook_idempotency;
CREATE POLICY "Service role full access" ON webhook_idempotency FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON order_status_history;
CREATE POLICY "Service role full access" ON order_status_history FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON admin_users;
CREATE POLICY "Service role full access" ON admin_users FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON admin_action_logs;
CREATE POLICY "Service role full access" ON admin_action_logs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON exchange_pairs;
CREATE POLICY "Service role full access" ON exchange_pairs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON exchange_settings;
CREATE POLICY "Service role full access" ON exchange_settings FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON admin_notes;
CREATE POLICY "Service role full access" ON admin_notes FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON flagged_users;
CREATE POLICY "Service role full access" ON flagged_users FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON crypto_prices;
CREATE POLICY "Service role full access" ON crypto_prices FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read access" ON crypto_prices;
CREATE POLICY "Public read access" ON crypto_prices FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role full access" ON disputes;
CREATE POLICY "Service role full access" ON disputes FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON wallets;
CREATE POLICY "Service role full access" ON wallets FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON payouts;
CREATE POLICY "Service role full access" ON payouts FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON user_login_logs;
CREATE POLICY "Service role full access" ON user_login_logs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON dispute_messages;
CREATE POLICY "Service role full access" ON dispute_messages FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON user_activity_logs;
CREATE POLICY "Service role full access" ON user_activity_logs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON dispute_sessions;
CREATE POLICY "Service role full access" ON dispute_sessions FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON blocked_ips;
CREATE POLICY "Service role full access" ON blocked_ips FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON exchange_limits;
CREATE POLICY "Service role full access" ON exchange_limits FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 10. COMMENTS
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN orders.status IS 'DEPRECATED: Use internal_status instead. Kept for backward compatibility.';
COMMENT ON COLUMN orders.internal_status IS 'Internal technical status (admin-only): NEW, AWAITING_DEPOSIT, CONFIRMING, PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, MANUAL_REVIEW, DONE, FAILED, EXPIRED';
COMMENT ON COLUMN orders.user_status IS 'User-facing simplified status: Waiting for payment, Waiting for confirmation, Payment confirmed, Processing, Completed, Failed, Expired';
COMMENT ON COLUMN orders.provider_status IS 'Raw status from NOWPayments API (admin-only reference)';
COMMENT ON COLUMN orders.user_id IS 'User ID for logged-in users, NULL for anonymous orders';
COMMENT ON COLUMN orders.payment_mode IS 'Payment mode: live (real payments) or sandbox (test payments)';
COMMENT ON COLUMN orders.purchase_id IS 'NOWPayments purchase_id for tracking multiple payments per order';
COMMENT ON COLUMN orders.sandbox_case IS 'Sandbox test case scenario (only used in sandbox mode)';
COMMENT ON COLUMN users.verification_token_expires_at IS 'When the verification token expires. Null if no token or token has no expiry (legacy).';

COMMENT ON TABLE email_queue IS 'Database-backed email queue. Emails are queued here and processed by cron job.';
COMMENT ON COLUMN email_queue.status IS 'pending: waiting to be sent, sent: successfully sent, failed: permanently failed after max attempts';
COMMENT ON COLUMN email_queue.attempts IS 'Number of send attempts (max 3 before marking as failed)';
COMMENT ON COLUMN email_queue.scheduled_at IS 'When this email should be processed (used for retry delays)';
COMMENT ON TABLE email_settings IS 'Admin-configurable email settings. Simple key-value store.';
COMMENT ON COLUMN email_settings.key IS 'Setting key (e.g., sender_email, sender_name, order_notifications_enabled)';
COMMENT ON COLUMN email_settings.value IS 'Setting value (string, parse as needed)';
COMMENT ON TABLE idempotency_keys IS 'Idempotency protection for critical actions. Prevents duplicate execution of same logical event.';
COMMENT ON COLUMN idempotency_keys.scope IS 'Action scope (e.g., order_status_email, payout, refund)';
COMMENT ON COLUMN idempotency_keys.key IS 'Unique key within scope (e.g., order:123:status:DONE)';
COMMENT ON TABLE ledger_entries IS 'Immutable financial ledger. Source of truth for all financial transactions. Append-only (no updates/deletes).';
COMMENT ON TABLE webhook_orphans IS 'Payment IDs received via webhook with no matching order. Enables recovery and alerting.';
COMMENT ON TABLE cron_runs IS 'Last run per cron endpoint. Update on success/failure for alerting.';
COMMENT ON TABLE blocked_ips IS 'IP addresses blocked from accessing the website';
COMMENT ON TABLE exchange_limits IS 'Cache for NOWPayments exchange min/max limits, updated every 10 minutes';

-- -----------------------------------------------------------------------------
-- 11. SEED DATA (ON CONFLICT DO NOTHING)
-- -----------------------------------------------------------------------------
INSERT INTO exchange_settings (key, value, updated_at)
VALUES
  ('maintenance_mode', '{"enabled": false}'::jsonb, NOW()),
  ('payout_mode', '{"mode": "manual"}'::jsonb, NOW()),
  ('payment_mode', '{"mode": "live"}'::jsonb, NOW()),
  ('sandbox_case', '{"case": "success"}'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO email_settings (key, value)
VALUES
  ('sender_email', 'noreply@mintmove.com'),
  ('sender_name', 'MintMove'),
  ('order_notifications_enabled', 'true'),
  ('verification_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Optional backfill for existing orders (028): set internal_status/user_status from status (no-op if already set)
UPDATE orders
SET
  internal_status = COALESCE(internal_status, CASE status
    WHEN 'pending' THEN 'NEW' WHEN 'confirming' THEN 'CONFIRMING' WHEN 'confirmed' THEN 'PAYMENT_CONFIRMED'
    WHEN 'exchange' THEN 'PROCESSING_BY_PROVIDER' WHEN 'done' THEN 'DONE' WHEN 'expired' THEN 'EXPIRED'
    WHEN 'failed' THEN 'FAILED' ELSE 'NEW' END),
  user_status = COALESCE(user_status, CASE status
    WHEN 'pending' THEN 'Waiting for payment' WHEN 'confirming' THEN 'Waiting for confirmation'
    WHEN 'confirmed' THEN 'Payment confirmed' WHEN 'exchange' THEN 'Processing'
    WHEN 'done' THEN 'Completed' WHEN 'expired' THEN 'Expired' WHEN 'failed' THEN 'Failed'
    ELSE 'Waiting for payment' END),
  status_source = COALESCE(status_source, 'system')
WHERE internal_status IS NULL OR user_status IS NULL OR status_source IS NULL;

-- -----------------------------------------------------------------------------
-- END MASTER MIGRATION
-- -----------------------------------------------------------------------------
