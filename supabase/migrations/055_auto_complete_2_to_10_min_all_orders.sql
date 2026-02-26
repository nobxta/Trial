-- Auto-complete all orders 2–10 minutes after payment confirmed (no verification needed).
-- Previously: only manual payout, 3–15 min. Now: all orders, 2–10 min (random per order).

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
  v_manual_auto_complete_at timestamptz;
  v_final_receive_amount decimal;
  v_to_amount decimal;
  v_old_pri int;
  v_new_pri int;
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

  SELECT internal_status INTO v_old_internal_status
  FROM orders
  WHERE order_id = p_params->>'order_id';

  IF v_old_internal_status IS NULL THEN
    RAISE EXCEPTION 'order_not_found: order_id %', p_params->>'order_id';
  END IF;

  -- Guard: Do not overwrite final states.
  IF v_old_internal_status IN ('DONE', 'FAILED', 'EXPIRED') THEN
    SELECT * INTO v_row FROM orders WHERE order_id = p_params->>'order_id';
    RETURN jsonb_build_object('already_processed', false, 'order', to_jsonb(v_row));
  END IF;

  v_new_internal_status := NULLIF(TRIM(p_params->>'internal_status'), '');
  v_final_receive_amount := (p_params->>'final_receive_amount')::decimal;
  v_to_amount := (p_params->>'to_amount')::decimal;

  -- No-downgrade: status must never go backward.
  IF v_new_internal_status IS NOT NULL THEN
    v_old_pri := internal_status_priority(v_old_internal_status);
    v_new_pri := internal_status_priority(v_new_internal_status);
    IF v_new_pri < v_old_pri THEN
      SELECT * INTO v_row FROM orders WHERE order_id = p_params->>'order_id';
      RETURN jsonb_build_object('already_processed', false, 'order', to_jsonb(v_row));
    END IF;
  END IF;

  -- All orders: schedule auto-complete 2–10 min after PAYMENT_CONFIRMED (no verification, no hash).
  IF v_new_internal_status IN ('PAYMENT_CONFIRMED', 'PROCESSING_BY_PROVIDER', 'MANUAL_REVIEW') THEN
    v_manual_auto_complete_at := NOW() + (2 + floor(random() * 9)) * interval '1 minute';
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

COMMENT ON FUNCTION process_webhook_status_update(jsonb) IS 'Atomic webhook processing. No-downgrade. When status becomes PAYMENT_CONFIRMED/PROCESSING_BY_PROVIDER/MANUAL_REVIEW, sets manual_auto_complete_at to now + random 2–10 min for all orders. Cron marks DONE when time reached.';

-- Index for cron: find orders ready for auto-complete (any payout_mode)
CREATE INDEX IF NOT EXISTS idx_orders_manual_auto_complete_at_any
ON orders(manual_auto_complete_at)
WHERE manual_auto_complete_at IS NOT NULL;
