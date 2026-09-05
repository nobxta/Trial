-- Lock down every PostgREST-exposed table.
--
-- Before this migration every table in the public schema was readable AND
-- writable by anyone holding the anon key -- which ships in the browser bundle
-- and is therefore public. That exposed user emails, bcrypt password hashes,
-- raw verification tokens, the super_admin row, orders and ledger entries, and
-- allowed UPDATE/DELETE on all of them.
--
-- Enabling RLS with no policies denies anon and authenticated by default. The
-- application is unaffected: all 62 data-access files use the service_role key,
-- which bypasses RLS. Nothing in the codebase queries with the anon client.

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flagged_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_orphans ENABLE ROW LEVEL SECURITY;

-- Defense in depth: PostgREST reaches tables through these roles, so removing
-- the grants blocks access even if a permissive policy is added later by mistake.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
