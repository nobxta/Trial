-- Rate mode, provider amounts, final receive amount, and exchange fee settings.
-- Makes fixed/floating backend-driven and provider-aligned.

-- 1. Orders: rate mode and provider amounts
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS rate_mode TEXT CHECK (rate_mode IN ('fixed', 'floating')),
  ADD COLUMN IF NOT EXISTS provider_rate_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_pay_amount DECIMAL(20, 8),
  ADD COLUMN IF NOT EXISTS final_receive_amount DECIMAL(20, 8);

COMMENT ON COLUMN orders.rate_mode IS 'Exchange rate mode at creation: fixed (rate locked ~20 min) or floating (rate at confirmation).';
COMMENT ON COLUMN orders.provider_rate_locked IS 'True when rate_mode is fixed and provider locked the rate.';
COMMENT ON COLUMN orders.provider_pay_amount IS 'Exact amount to send (crypto) from NOWPayments create payment response (pay_amount).';
COMMENT ON COLUMN orders.final_receive_amount IS 'Actual receive amount from provider (e.g. outcome_amount in webhook when finished).';

-- 2. Exchange fee settings (single row: fixed_fee_percent, floating_fee_percent)
CREATE TABLE IF NOT EXISTS exchange_fee_settings (
  id SERIAL PRIMARY KEY,
  fixed_fee_percent DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
  floating_fee_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO exchange_fee_settings (id, fixed_fee_percent, floating_fee_percent)
VALUES (1, 1.0, 0.5)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE exchange_fee_settings IS 'Global exchange fee percentages: fixed rate and floating rate. Use id=1 as the single row.';

-- 3. create_order_with_history: accept and store new columns
CREATE OR REPLACE FUNCTION create_order_with_history(p_order jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row orders%ROWTYPE;
  v_order_id text;
BEGIN
  INSERT INTO orders (
    user_id,
    order_id,
    payment_id,
    purchase_id,
    payment_mode,
    sandbox_case,
    payout_mode,
    internal_status,
    user_status,
    status,
    status_source,
    from_currency,
    from_amount,
    from_network,
    from_address,
    to_currency,
    to_amount,
    to_network,
    to_address,
    provider_rate,
    expected_receive,
    rate_timestamp,
    rate_deviation_percent,
    rate_mode,
    provider_rate_locked,
    provider_pay_amount,
    final_receive_amount
  ) VALUES (
    (p_order->>'user_id')::uuid,
    p_order->>'order_id',
    NULLIF(TRIM(p_order->>'payment_id'), ''),
    NULLIF(TRIM(p_order->>'purchase_id'), ''),
    NULLIF(TRIM(p_order->>'payment_mode'), ''),
    NULLIF(TRIM(p_order->>'sandbox_case'), ''),
    NULLIF(TRIM(p_order->>'payout_mode'), ''),
    COALESCE(NULLIF(TRIM(p_order->>'internal_status'), ''), 'NEW'),
    COALESCE(NULLIF(TRIM(p_order->>'user_status'), ''), 'Waiting for payment'),
    COALESCE(NULLIF(TRIM(p_order->>'status'), ''), 'NEW'),
    COALESCE(NULLIF(TRIM(p_order->>'status_source'), ''), 'system'),
    p_order->>'from_currency',
    (p_order->>'from_amount')::decimal,
    NULLIF(TRIM(p_order->>'from_network'), ''),
    NULLIF(TRIM(p_order->>'from_address'), ''),
    p_order->>'to_currency',
    (p_order->>'to_amount')::decimal,
    NULLIF(TRIM(p_order->>'to_network'), ''),
    NULLIF(TRIM(p_order->>'to_address'), ''),
    (p_order->>'provider_rate')::decimal,
    (p_order->>'expected_receive')::decimal,
    (p_order->>'rate_timestamp')::timestamptz,
    (p_order->>'rate_deviation_percent')::decimal,
    NULLIF(TRIM(p_order->>'rate_mode'), ''),
    COALESCE((p_order->>'provider_rate_locked')::boolean, false),
    (p_order->>'provider_pay_amount')::decimal,
    (p_order->>'final_receive_amount')::decimal
  )
  RETURNING * INTO v_row;

  v_order_id := v_row.order_id;

  INSERT INTO order_status_history (order_id, status, source)
  VALUES (v_order_id, v_row.internal_status, COALESCE(v_row.status_source, 'system'));

  RETURN to_jsonb(v_row);
END;
$$;

COMMENT ON FUNCTION create_order_with_history(jsonb) IS 'Creates order and initial status history. Includes rate_mode, provider_rate_locked, provider_pay_amount, final_receive_amount.';

-- 4. process_webhook_status_update: allow updating to_amount and final_receive_amount from payload (e.g. floating rate outcome)
CREATE OR REPLACE FUNCTION process_webhook_status_update(p_params jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
  v_row orders%ROWTYPE;
  v_old_internal_status text;
  v_new_internal_status text;
  v_payout_mode text;
  v_manual_auto_complete_at timestamptz;
  v_final_receive_amount decimal;
  v_to_amount decimal;
BEGIN
  INSERT INTO webhook_idempotency (payment_id, payment_status, order_id)
  VALUES (
    p_params->>'payment_id',
    p_params->>'payment_status',
    p_params->>'order_id'
  )
  ON CONFLICT (payment_id, payment_status) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('already_processed', true);
  END IF;

  SELECT internal_status, payout_mode INTO v_old_internal_status, v_payout_mode
  FROM orders
  WHERE order_id = p_params->>'order_id';

  IF v_old_internal_status IS NULL THEN
    RAISE EXCEPTION 'order_not_found: order_id %', p_params->>'order_id';
  END IF;

  IF v_old_internal_status IN ('DONE', 'FAILED', 'EXPIRED') THEN
    SELECT * INTO v_row FROM orders WHERE order_id = p_params->>'order_id';
    RETURN jsonb_build_object('already_processed', false, 'order', to_jsonb(v_row));
  END IF;

  v_new_internal_status := NULLIF(TRIM(p_params->>'internal_status'), '');
  v_final_receive_amount := (p_params->>'final_receive_amount')::decimal;
  v_to_amount := (p_params->>'to_amount')::decimal;

  IF v_payout_mode = 'manual'
     AND v_new_internal_status IN ('PAYMENT_CONFIRMED', 'PROCESSING_BY_PROVIDER', 'MANUAL_REVIEW') THEN
    v_manual_auto_complete_at := NOW() + (3 + floor(random() * 13)) * interval '1 minute';
  ELSE
    v_manual_auto_complete_at := NULL;
  END IF;

  UPDATE orders
  SET
    internal_status = COALESCE(v_new_internal_status, internal_status),
    user_status = COALESCE(NULLIF(TRIM(p_params->>'user_status'), ''), user_status),
    status = COALESCE(v_new_internal_status, status),
    status_source = COALESCE(NULLIF(TRIM(p_params->>'status_source'), ''), 'webhook'),
    provider_status = NULLIF(TRIM(p_params->>'provider_status'), ''),
    from_address = COALESCE(NULLIF(TRIM(p_params->>'from_address'), ''), from_address),
    payin_hash = COALESCE(NULLIF(TRIM(p_params->>'payin_hash'), ''), payin_hash),
    payout_hash = COALESCE(NULLIF(TRIM(p_params->>'payout_hash'), ''), payout_hash),
    payout_hash_entered_at = CASE WHEN NULLIF(TRIM(p_params->>'payout_hash'), '') IS NOT NULL THEN NOW() ELSE payout_hash_entered_at END,
    updated_at = NOW(),
    manual_auto_complete_at = CASE
      WHEN v_manual_auto_complete_at IS NOT NULL AND manual_auto_complete_at IS NULL THEN v_manual_auto_complete_at
      ELSE manual_auto_complete_at
    END,
    final_receive_amount = CASE WHEN v_final_receive_amount IS NOT NULL THEN v_final_receive_amount ELSE final_receive_amount END,
    to_amount = CASE WHEN v_to_amount IS NOT NULL THEN v_to_amount ELSE to_amount END
  WHERE order_id = p_params->>'order_id'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order update failed: order_id %', p_params->>'order_id';
  END IF;

  IF v_old_internal_status IS DISTINCT FROM v_new_internal_status THEN
    INSERT INTO order_status_history (order_id, status, source, payment_status, metadata)
    VALUES (
      p_params->>'order_id',
      v_new_internal_status,
      'webhook',
      NULLIF(TRIM(p_params->>'payment_status'), ''),
      jsonb_build_object(
        'payin_hash', NULLIF(TRIM(p_params->>'payin_hash'), ''),
        'payout_hash', NULLIF(TRIM(p_params->>'payout_hash'), '')
      )
    );
  END IF;

  RETURN jsonb_build_object('already_processed', false, 'order', to_jsonb(v_row));
END;
$$;

COMMENT ON FUNCTION process_webhook_status_update(jsonb) IS 'Atomic webhook processing. Updates final_receive_amount and to_amount when provided (e.g. floating rate outcome from provider).';
