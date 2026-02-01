-- 046: Atomic idempotency claim, ledger+idempotency in one transaction, orphan tracking, cron visibility
-- Required: prevents duplicate side effects under concurrent webhooks; ensures ledger never diverges from idempotency; orphan recovery; cron observability.

-- 1) Atomic idempotency claim: only the caller that inserts may run side effects.
-- INSERT ... ON CONFLICT DO NOTHING RETURNING id ensures one winner under concurrency.
CREATE OR REPLACE FUNCTION try_claim_idempotency(p_scope text, p_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO idempotency_keys (scope, key)
  VALUES (p_scope, p_key)
  ON CONFLICT (scope, key) DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id IS NOT NULL;
END;
$$;
COMMENT ON FUNCTION try_claim_idempotency(text, text) IS 'Atomic claim: returns true only if this call inserted the row. Use for order_status_email and any run-once-per-key logic.';

-- 2) Ledger + idempotency in one transaction: claim then credit; commit only if both succeed.
-- Hard rule: if idempotency row exists, ledger entries MUST exist.
CREATE OR REPLACE FUNCTION record_order_completion_atomic(
  p_order_id text,
  p_user_id uuid,
  p_to_amount numeric,
  p_to_currency text,
  p_from_amount numeric,
  p_from_currency text,
  p_fee_percent numeric DEFAULT 0.01
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scope text := 'ledger_entry';
  v_key text := 'order:' || p_order_id || ':ledger';
  v_id uuid;
  v_fee_amount numeric;
BEGIN
  -- Claim idempotency in same transaction as ledger writes
  INSERT INTO idempotency_keys (scope, key)
  VALUES (v_scope, v_key)
  ON CONFLICT (scope, key) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN true; -- Already recorded (idempotent)
  END IF;

  v_fee_amount := p_from_amount * p_fee_percent;

  -- User credit (payout)
  INSERT INTO ledger_entries (order_id, user_id, type, category, amount, currency)
  VALUES (p_order_id, p_user_id, 'credit', 'payout', p_to_amount, upper(p_to_currency));

  -- Platform fee (if positive)
  IF v_fee_amount > 0 THEN
    INSERT INTO ledger_entries (order_id, user_id, type, category, amount, currency)
    VALUES (p_order_id, NULL, 'credit', 'fee', v_fee_amount, upper(p_from_currency));
  END IF;

  RETURN true;
END;
$$;
COMMENT ON FUNCTION record_order_completion_atomic(text, uuid, numeric, text, numeric, text, numeric) IS 'Records order completion in ledger inside same transaction as idempotency claim. If idempotency exists, ledger entries exist.';

-- 3) Orphan payment tracking: webhook received payment_id but no order (e.g. order creation failed).
-- Enables recovery path and alerting; do not silently swallow.
CREATE TABLE IF NOT EXISTS webhook_orphans (
  payment_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  payload_snapshot jsonb,
  recovered_at timestamptz,
  recovered_order_id text
);
CREATE INDEX IF NOT EXISTS idx_webhook_orphans_created_at ON webhook_orphans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_orphans_recovered_at ON webhook_orphans(recovered_at) WHERE recovered_at IS NULL;
COMMENT ON TABLE webhook_orphans IS 'Payment IDs received via webhook with no matching order. Enables recovery and alerting.';

-- 4) Cron visibility: last successful run per endpoint, for alerting when no success > N minutes.
CREATE TABLE IF NOT EXISTS cron_runs (
  endpoint text PRIMARY KEY,
  last_success_at timestamptz,
  last_error text,
  last_run_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE cron_runs IS 'Last run per cron endpoint. Update on success/failure for alerting.';
