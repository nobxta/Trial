-- Final Merged Schema
-- This file consolidates all migration files into a single canonical schema
-- Generated from all migrations in supabase/migrations/

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update dispute last_message_at
CREATE OR REPLACE FUNCTION update_dispute_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE disputes
    SET last_message_at = NEW.created_at
    WHERE id = NEW.dispute_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update session last_active_at
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE dispute_sessions
    SET last_active_at = NOW()
    WHERE chat_id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLES (in dependency order)
-- ============================================================================

-- Admin users table (core table, created first as users references it)
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

-- Users table (core table, depends on admin_users for blocked_by)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  affiliate_code TEXT UNIQUE,
  api_key TEXT,
  blocked BOOLEAN DEFAULT FALSE,
  blocked_at TIMESTAMP WITH TIME ZONE,
  blocked_by UUID REFERENCES admin_users(id),
  block_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Addresses table (depends on users)
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

-- Affiliates table (depends on users)
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

-- Orders table (depends on users)
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT UNIQUE NOT NULL,
  payment_id TEXT,
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

-- Referrals table (depends on affiliates and users and orders)
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

-- Admin action logs table (depends on admin_users)
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

-- Exchange settings table (depends on admin_users)
CREATE TABLE IF NOT EXISTS exchange_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id)
);

-- Admin notes table (depends on admin_users, orders, users)
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

-- Flagged users table (depends on users and admin_users)
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

-- Exchange pairs table (independent)
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

-- Webhook idempotency table (independent)
CREATE TABLE IF NOT EXISTS webhook_idempotency (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  order_id TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(payment_id, payment_status)
);

-- Order status history table (depends on orders)
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  payment_status TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crypto prices table (independent)
CREATE TABLE IF NOT EXISTS crypto_prices (
  coin_id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  price_usd NUMERIC(20, 8) NOT NULL DEFAULT 0,
  price_change_24h NUMERIC(10, 4),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Disputes table (depends on orders, users, admin_users)
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

-- Wallets table (independent)
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

-- Payouts table (depends on orders, wallets, admin_users)
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

-- User login logs table (depends on users)
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

-- Dispute messages table (depends on disputes)
CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'admin', 'system')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  CONSTRAINT valid_message_length CHECK (char_length(message) > 0 AND char_length(message) <= 5000)
);

-- User activity logs table (depends on users)
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dispute sessions table (depends on disputes)
CREATE TABLE IF NOT EXISTS dispute_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES disputes(chat_id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email queue table (independent)
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

-- Email settings table (independent)
CREATE TABLE IF NOT EXISTS email_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Idempotency keys table (independent)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(scope, key)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_affiliate_code ON users(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_users_blocked ON users(blocked);

-- Addresses indexes
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_default ON addresses(user_id, is_default) WHERE is_default = TRUE;

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_locked ON orders(locked);
CREATE INDEX IF NOT EXISTS idx_orders_internal_status ON orders(internal_status);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_status);
CREATE INDEX IF NOT EXISTS idx_orders_manual_review ON orders(manual_review_required) WHERE manual_review_required = TRUE;
CREATE INDEX IF NOT EXISTS idx_orders_status_source ON orders(status_source);

-- Affiliates indexes
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);

-- Referrals indexes
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate_id ON referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_order_id ON referrals(order_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Webhook idempotency indexes
CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_payment_id ON webhook_idempotency(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_order_id ON webhook_idempotency(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_processed_at ON webhook_idempotency(processed_at DESC);

-- Order status history indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_status ON order_status_history(status);

-- Admin users indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Admin action logs indexes
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_id ON admin_action_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action_type ON admin_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_resource_type ON admin_action_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_resource_id ON admin_action_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at ON admin_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_entity ON admin_action_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_entity_id ON admin_action_logs(entity_id);

-- Exchange settings indexes
CREATE INDEX IF NOT EXISTS idx_exchange_settings_key ON exchange_settings(key);

-- Admin notes indexes
CREATE INDEX IF NOT EXISTS idx_admin_notes_order_id ON admin_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_user_id ON admin_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_admin_id ON admin_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_created_at ON admin_notes(created_at DESC);

-- Flagged users indexes
CREATE INDEX IF NOT EXISTS idx_flagged_users_user_id ON flagged_users(user_id);
CREATE INDEX IF NOT EXISTS idx_flagged_users_flagged_by ON flagged_users(flagged_by);
CREATE INDEX IF NOT EXISTS idx_flagged_users_flagged_at ON flagged_users(flagged_at DESC);
CREATE INDEX IF NOT EXISTS idx_flagged_users_resolved_at ON flagged_users(resolved_at);

-- Exchange pairs indexes
CREATE INDEX IF NOT EXISTS idx_exchange_pairs_from_currency ON exchange_pairs(from_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_pairs_to_currency ON exchange_pairs(to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_pairs_enabled ON exchange_pairs(enabled);

-- Crypto prices indexes
CREATE INDEX IF NOT EXISTS idx_crypto_prices_symbol ON crypto_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_crypto_prices_updated_at ON crypto_prices(updated_at);

-- Disputes indexes
CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_chat_id ON disputes(chat_id);
CREATE INDEX IF NOT EXISTS idx_disputes_type_status ON disputes(type, status);
CREATE INDEX IF NOT EXISTS idx_disputes_last_message_at ON disputes(last_message_at DESC);

-- Wallets indexes
CREATE INDEX IF NOT EXISTS idx_wallets_network ON wallets(network);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(type);
CREATE INDEX IF NOT EXISTS idx_wallets_is_active ON wallets(is_active);

-- Payouts indexes
CREATE INDEX IF NOT EXISTS idx_payouts_order_id ON payouts(order_id);
CREATE INDEX IF NOT EXISTS idx_payouts_wallet_id ON payouts(wallet_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_tx_hash ON payouts(tx_hash);

-- User login logs indexes
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_login_at ON user_login_logs(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_ip_address ON user_login_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id_login_at ON user_login_logs(user_id, login_at DESC);

-- Dispute messages indexes
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_read_at ON dispute_messages(dispute_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created_at ON dispute_messages(created_at DESC);

-- User activity logs indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id_created_at ON user_activity_logs(user_id, created_at DESC);

-- Dispute sessions indexes
CREATE INDEX IF NOT EXISTS idx_dispute_sessions_chat_id ON dispute_sessions(chat_id);
CREATE INDEX IF NOT EXISTS idx_dispute_sessions_ip_hash ON dispute_sessions(ip_hash);
CREATE INDEX IF NOT EXISTS idx_dispute_sessions_last_active ON dispute_sessions(last_active_at DESC);

-- Email queue indexes
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_at ON email_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled ON email_queue(status, scheduled_at);

-- Idempotency keys indexes
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_scope ON idempotency_keys(scope);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_scope_key ON idempotency_keys(scope, key);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers (drop existing triggers first to handle re-runs)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_addresses_updated_at ON addresses;
CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_affiliates_updated_at ON affiliates;
CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exchange_pairs_updated_at ON exchange_pairs;
CREATE TRIGGER update_exchange_pairs_updated_at
  BEFORE UPDATE ON exchange_pairs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exchange_settings_updated_at ON exchange_settings;
CREATE TRIGGER update_exchange_settings_updated_at
  BEFORE UPDATE ON exchange_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_notes_updated_at ON admin_notes;
CREATE TRIGGER update_admin_notes_updated_at
  BEFORE UPDATE ON admin_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crypto_prices_updated_at ON crypto_prices;
CREATE TRIGGER update_crypto_prices_updated_at
  BEFORE UPDATE ON crypto_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_disputes_updated_at ON disputes;
CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payouts_updated_at ON payouts;
CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Chat triggers
DROP TRIGGER IF EXISTS trigger_update_dispute_last_message ON dispute_messages;
CREATE TRIGGER trigger_update_dispute_last_message
AFTER INSERT ON dispute_messages
FOR EACH ROW
EXECUTE FUNCTION update_dispute_last_message();-- but the function references dispute_sessions table which is fine

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
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

-- Service role full access policies (drop existing policies first to handle re-runs)
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

-- Public read access for crypto_prices
DROP POLICY IF EXISTS "Public read access" ON crypto_prices;
CREATE POLICY "Public read access" ON crypto_prices FOR SELECT USING (true);
-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN orders.status IS 'DEPRECATED: Use internal_status instead. Kept for backward compatibility.';
COMMENT ON COLUMN orders.internal_status IS 'Internal technical status (admin-only): NEW, AWAITING_DEPOSIT, CONFIRMING, PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, MANUAL_REVIEW, DONE, FAILED, EXPIRED';
COMMENT ON COLUMN orders.user_status IS 'User-facing simplified status: Waiting for payment, Waiting for confirmation, Payment confirmed, Processing, Completed, Failed, Expired';
COMMENT ON COLUMN orders.provider_status IS 'Raw status from NOWPayments API (admin-only reference)';

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

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default exchange settings
INSERT INTO exchange_settings (key, value, updated_at)
VALUES 
  ('maintenance_mode', '{"enabled": false}'::jsonb, NOW()),
  ('payout_mode', '{"mode": "manual"}'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;

-- Insert default email settings
INSERT INTO email_settings (key, value) VALUES
  ('sender_email', 'noreply@mintmove.com'),
  ('sender_name', 'MintMove'),
  ('order_notifications_enabled', 'true'),
  ('verification_enabled', 'true')
ON CONFLICT (key) DO NOTHING;


-- Generated from all migrations in supabase/migrations/

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update dispute last_message_at
CREATE OR REPLACE FUNCTION update_dispute_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE disputes
    SET last_message_at = NEW.created_at
    WHERE id = NEW.dispute_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update session last_active_at
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE dispute_sessions
    SET last_active_at = NOW()
    WHERE chat_id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLES (in dependency order)
-- ============================================================================

-- Admin users table (core table, created first as users references it)
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

-- Users table (core table, depends on admin_users for blocked_by)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  affiliate_code TEXT UNIQUE,
  api_key TEXT,
  blocked BOOLEAN DEFAULT FALSE,
  blocked_at TIMESTAMP WITH TIME ZONE,
  blocked_by UUID REFERENCES admin_users(id),
  block_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Addresses table (depends on users)
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

-- Affiliates table (depends on users)
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

-- Orders table (depends on users)
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT UNIQUE NOT NULL,
  payment_id TEXT,
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

-- Referrals table (depends on affiliates and users and orders)
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

-- Admin action logs table (depends on admin_users)
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

-- Exchange settings table (depends on admin_users)
CREATE TABLE IF NOT EXISTS exchange_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id)
);

-- Admin notes table (depends on admin_users, orders, users)
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

-- Flagged users table (depends on users and admin_users)
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

-- Exchange pairs table (independent)
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

-- Webhook idempotency table (independent)
CREATE TABLE IF NOT EXISTS webhook_idempotency (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  order_id TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(payment_id, payment_status)
);

-- Order status history table (depends on orders)
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  payment_status TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crypto prices table (independent)
CREATE TABLE IF NOT EXISTS crypto_prices (
  coin_id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  price_usd NUMERIC(20, 8) NOT NULL DEFAULT 0,
  price_change_24h NUMERIC(10, 4),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Disputes table (depends on orders, users, admin_users)
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

-- Wallets table (independent)
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

-- Payouts table (depends on orders, wallets, admin_users)
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

-- User login logs table (depends on users)
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

-- Dispute messages table (depends on disputes)
CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'admin', 'system')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  CONSTRAINT valid_message_length CHECK (char_length(message) > 0 AND char_length(message) <= 5000)
);

-- User activity logs table (depends on users)
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dispute sessions table (depends on disputes)
CREATE TABLE IF NOT EXISTS dispute_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES disputes(chat_id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email queue table (independent)
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

-- Email settings table (independent)
CREATE TABLE IF NOT EXISTS email_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Idempotency keys table (independent)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(scope, key)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_affiliate_code ON users(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_users_blocked ON users(blocked);

-- Addresses indexes
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_default ON addresses(user_id, is_default) WHERE is_default = TRUE;

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_locked ON orders(locked);
CREATE INDEX IF NOT EXISTS idx_orders_internal_status ON orders(internal_status);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_status);
CREATE INDEX IF NOT EXISTS idx_orders_manual_review ON orders(manual_review_required) WHERE manual_review_required = TRUE;
CREATE INDEX IF NOT EXISTS idx_orders_status_source ON orders(status_source);

-- Affiliates indexes
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);

-- Referrals indexes
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate_id ON referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_order_id ON referrals(order_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Webhook idempotency indexes
CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_payment_id ON webhook_idempotency(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_order_id ON webhook_idempotency(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_processed_at ON webhook_idempotency(processed_at DESC);

-- Order status history indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_status ON order_status_history(status);

-- Admin users indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Admin action logs indexes
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_id ON admin_action_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action_type ON admin_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_resource_type ON admin_action_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_resource_id ON admin_action_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at ON admin_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_entity ON admin_action_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_entity_id ON admin_action_logs(entity_id);

-- Exchange settings indexes
CREATE INDEX IF NOT EXISTS idx_exchange_settings_key ON exchange_settings(key);

-- Admin notes indexes
CREATE INDEX IF NOT EXISTS idx_admin_notes_order_id ON admin_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_user_id ON admin_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_admin_id ON admin_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_created_at ON admin_notes(created_at DESC);

-- Flagged users indexes
CREATE INDEX IF NOT EXISTS idx_flagged_users_user_id ON flagged_users(user_id);
CREATE INDEX IF NOT EXISTS idx_flagged_users_flagged_by ON flagged_users(flagged_by);
CREATE INDEX IF NOT EXISTS idx_flagged_users_flagged_at ON flagged_users(flagged_at DESC);
CREATE INDEX IF NOT EXISTS idx_flagged_users_resolved_at ON flagged_users(resolved_at);

-- Exchange pairs indexes
CREATE INDEX IF NOT EXISTS idx_exchange_pairs_from_currency ON exchange_pairs(from_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_pairs_to_currency ON exchange_pairs(to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_pairs_enabled ON exchange_pairs(enabled);

-- Crypto prices indexes
CREATE INDEX IF NOT EXISTS idx_crypto_prices_symbol ON crypto_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_crypto_prices_updated_at ON crypto_prices(updated_at);

-- Disputes indexes
CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_chat_id ON disputes(chat_id);
CREATE INDEX IF NOT EXISTS idx_disputes_type_status ON disputes(type, status);
CREATE INDEX IF NOT EXISTS idx_disputes_last_message_at ON disputes(last_message_at DESC);

-- Wallets indexes
CREATE INDEX IF NOT EXISTS idx_wallets_network ON wallets(network);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(type);
CREATE INDEX IF NOT EXISTS idx_wallets_is_active ON wallets(is_active);

-- Payouts indexes
CREATE INDEX IF NOT EXISTS idx_payouts_order_id ON payouts(order_id);
CREATE INDEX IF NOT EXISTS idx_payouts_wallet_id ON payouts(wallet_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_tx_hash ON payouts(tx_hash);

-- User login logs indexes
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_login_at ON user_login_logs(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_ip_address ON user_login_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id_login_at ON user_login_logs(user_id, login_at DESC);

-- Dispute messages indexes
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_read_at ON dispute_messages(dispute_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created_at ON dispute_messages(created_at DESC);

-- User activity logs indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id_created_at ON user_activity_logs(user_id, created_at DESC);

-- Dispute sessions indexes
CREATE INDEX IF NOT EXISTS idx_dispute_sessions_chat_id ON dispute_sessions(chat_id);
CREATE INDEX IF NOT EXISTS idx_dispute_sessions_ip_hash ON dispute_sessions(ip_hash);
CREATE INDEX IF NOT EXISTS idx_dispute_sessions_last_active ON dispute_sessions(last_active_at DESC);

-- Email queue indexes
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_at ON email_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled ON email_queue(status, scheduled_at);

-- Idempotency keys indexes
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_scope ON idempotency_keys(scope);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_scope_key ON idempotency_keys(scope, key);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers (drop existing triggers first to handle re-runs)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_addresses_updated_at ON addresses;
CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_affiliates_updated_at ON affiliates;
CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exchange_pairs_updated_at ON exchange_pairs;
CREATE TRIGGER update_exchange_pairs_updated_at
  BEFORE UPDATE ON exchange_pairs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exchange_settings_updated_at ON exchange_settings;
CREATE TRIGGER update_exchange_settings_updated_at
  BEFORE UPDATE ON exchange_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_notes_updated_at ON admin_notes;
CREATE TRIGGER update_admin_notes_updated_at
  BEFORE UPDATE ON admin_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crypto_prices_updated_at ON crypto_prices;
CREATE TRIGGER update_crypto_prices_updated_at
  BEFORE UPDATE ON crypto_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_disputes_updated_at ON disputes;
CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payouts_updated_at ON payouts;
CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Chat triggers
DROP TRIGGER IF EXISTS trigger_update_dispute_last_message ON dispute_messages;
CREATE TRIGGER trigger_update_dispute_last_message
AFTER INSERT ON dispute_messages
FOR EACH ROW
EXECUTE FUNCTION update_dispute_last_message();-- but the function references dispute_sessions table which is fine

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
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

-- Service role full access policies (drop existing policies first to handle re-runs)
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

-- Public read access for crypto_prices
DROP POLICY IF EXISTS "Public read access" ON crypto_prices;
CREATE POLICY "Public read access" ON crypto_prices FOR SELECT USING (true);
-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN orders.status IS 'DEPRECATED: Use internal_status instead. Kept for backward compatibility.';
COMMENT ON COLUMN orders.internal_status IS 'Internal technical status (admin-only): NEW, AWAITING_DEPOSIT, CONFIRMING, PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, MANUAL_REVIEW, DONE, FAILED, EXPIRED';
COMMENT ON COLUMN orders.user_status IS 'User-facing simplified status: Waiting for payment, Waiting for confirmation, Payment confirmed, Processing, Completed, Failed, Expired';
COMMENT ON COLUMN orders.provider_status IS 'Raw status from NOWPayments API (admin-only reference)';

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

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default exchange settings
INSERT INTO exchange_settings (key, value, updated_at)
VALUES 
  ('maintenance_mode', '{"enabled": false}'::jsonb, NOW()),
  ('payout_mode', '{"mode": "manual"}'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;

-- Insert default email settings
INSERT INTO email_settings (key, value) VALUES
  ('sender_email', 'noreply@mintmove.com'),
  ('sender_name', 'MintMove'),
  ('order_notifications_enabled', 'true'),
  ('verification_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

