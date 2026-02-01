-- Harden: Prevent webhook/cron from overwriting final states (DONE, FAILED, EXPIRED).
-- Once an order is in a final state, do not apply any further webhook or cron update.
-- Idempotency row is still inserted (event consumed); order is unchanged.

CREATE OR REPLACE FUNCTION process_webhook_status_update(p_params jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
  v_row orders%ROWTYPE;
  v_old_internal_status text;
BEGIN
  -- Step 1: Claim idempotency. INSERT only succeeds if (payment_id, payment_status) not seen.
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

  -- Step 2: Read current order status.
  SELECT internal_status INTO v_old_internal_status
  FROM orders
  WHERE order_id = p_params->>'order_id';

  IF v_old_internal_status IS NULL THEN
    RAISE EXCEPTION 'order_not_found: order_id %', p_params->>'order_id';
  END IF;

  -- Guard: Do not overwrite final states. Consume event but leave order unchanged.
  IF v_old_internal_status IN ('DONE', 'FAILED', 'EXPIRED') THEN
    SELECT * INTO v_row FROM orders WHERE order_id = p_params->>'order_id';
    RETURN jsonb_build_object('already_processed', false, 'order', to_jsonb(v_row));
  END IF;

  -- Step 3: Update order (status, provider fields, hashes).
  UPDATE orders
  SET
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
  WHERE order_id = p_params->>'order_id'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order update failed: order_id %', p_params->>'order_id';
  END IF;

  -- Step 4: Insert history only when status actually changed.
  IF v_old_internal_status IS DISTINCT FROM (p_params->>'internal_status') THEN
    INSERT INTO order_status_history (order_id, status, source, payment_status, metadata)
    VALUES (
      p_params->>'order_id',
      p_params->>'internal_status',
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

COMMENT ON FUNCTION process_webhook_status_update(jsonb) IS 'Atomic webhook processing: idempotency insert, order status update, and history insert in one transaction. Final states (DONE, FAILED, EXPIRED) are never overwritten by webhook or cron.';
