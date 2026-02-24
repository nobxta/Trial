-- Update create_order_with_history to accept and store payout_mode (requires 047_add_orders_payout_mode).

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
    rate_deviation_percent
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
    (p_order->>'rate_deviation_percent')::decimal
  )
  RETURNING * INTO v_row;

  v_order_id := v_row.order_id;

  INSERT INTO order_status_history (order_id, status, source)
  VALUES (v_order_id, v_row.internal_status, COALESCE(v_row.status_source, 'system'));

  RETURN to_jsonb(v_row);
END;
$$;

COMMENT ON FUNCTION create_order_with_history(jsonb) IS 'Creates order and initial status history in one transaction. payout_mode: manual | automatic, set from global setting at creation.';
