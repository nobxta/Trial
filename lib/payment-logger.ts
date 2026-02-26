/**
 * Structured logging for NOWPayments integration.
 * All logs are JSON for production aggregation. No PII or full payment_id in logs.
 */

function maskPaymentId(paymentId: string | number | null | undefined): string {
  if (paymentId == null || paymentId === '') return 'none';
  const s = String(paymentId);
  if (s.length <= 4) return '****';
  return `***${s.slice(-4)}`;
}

function maskAddress(addr: string | null | undefined): string {
  if (addr == null || addr === '') return 'none';
  const s = String(addr).trim();
  if (s.length <= 12) return '****';
  return `${s.slice(0, 8)}...${s.slice(-6)}`;
}

export const paymentLogger = {
  /** After successful POST /v1/payment (create). Exact URL sent to provider for webhook delivery verification. */
  paymentCreated(data: {
    order_id: string;
    payment_id_suffix: string;
    ipn_callback_url_set: boolean;
    ipn_callback_url_used: string;
    mode: 'live' | 'sandbox';
  }) {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'payment_created',
        timestamp: new Date().toISOString(),
        source: 'payment_api',
        ...data,
      })
    );
  },

  /** GET payment status request/response (polling). */
  paymentStatusPoll(data: {
    payment_id_suffix: string;
    mode: string;
    response_status: string;
    ok: boolean;
  }) {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'payment_status_poll',
        timestamp: new Date().toISOString(),
        source: 'payment_api',
        ...data,
      })
    );
  },

  /** Webhook HTTP response (for debugging delivery). */
  webhookResponse(data: { status: number; event: string }) {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'webhook_response',
        timestamp: new Date().toISOString(),
        source: 'webhook',
        ...data,
      })
    );
  },

  /** Order status updated from any source (webhook/polling/admin). */
  orderStatusUpdated(data: {
    order_id: string;
    internal_status: string;
    source: string;
  }) {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'order_status_updated',
        timestamp: new Date().toISOString(),
        ...data,
      })
    );
  },

  /** Email send attempted for order status. */
  emailAttempt(data: {
    order_id: string;
    status: string;
    success: boolean;
    error?: string;
    smtp_response?: string;
  }) {
    console.log(
      JSON.stringify({
        level: data.success ? 'info' : 'warn',
        message: 'email_attempt',
        timestamp: new Date().toISOString(),
        source: 'notifications',
        ...data,
      })
    );
  },

  /** Runtime: environment used at payment creation (creation and polling use same config per mode). */
  envConsistency(data: {
    payment_creation_base_url: string;
    polling_base_url: string;
    mode: 'live' | 'sandbox';
    api_key_prefix: string;
  }) {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'env_consistency',
        timestamp: new Date().toISOString(),
        source: 'payment_runtime',
        ...data,
      })
    );
  },

  /** Runtime: every request hitting webhook endpoint. */
  webhookRequestReceived(data: { remote_ip: string; timestamp: string }) {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'webhook_request_received',
        timestamp: data.timestamp,
        source: 'webhook_runtime',
        remote_ip: data.remote_ip,
      })
    );
  },

  /** Runtime: signature verification failed – log for mismatch debug. */
  webhookSignatureMismatch(data: {
    received_signature: string;
    calculated_signature_raw: string;
    calculated_signature_canonical: string;
    payload_hash_sha256: string;
    payment_mode: string;
  }) {
    console.log(
      JSON.stringify({
        level: 'warn',
        message: 'webhook_signature_mismatch',
        timestamp: new Date().toISOString(),
        source: 'webhook_runtime',
        ...data,
      })
    );
  },

  /** Runtime: polling job started (cron or order GET). */
  pollJobStarted(data: { job_type: 'cron_reconcile' | 'order_get_poll'; timestamp: string }) {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'poll_job_started',
        source: 'poll_runtime',
        ...data,
      })
    );
  },

  /** Runtime: which payment_id we are querying (masked). */
  paymentIdChecked(data: { payment_id_suffix: string; order_id: string; mode: string }) {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'payment_id_checked',
        timestamp: new Date().toISOString(),
        source: 'poll_runtime',
        ...data,
      })
    );
  },

  /** Runtime: status returned by NOWPayments for this payment. */
  providerStatusReturned(data: {
    payment_id_suffix: string;
    order_id: string;
    provider_status_returned: string | null;
  }) {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'provider_status_returned',
        timestamp: new Date().toISOString(),
        source: 'poll_runtime',
        ...data,
      })
    );
  },

  /** Runtime: DB was updated after poll/webhook. */
  dbStatusUpdated(data: { order_id: string; internal_status: string; source: string }) {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'db_status_updated',
        timestamp: new Date().toISOString(),
        ...data,
      })
    );
  },

  /** Status downgrade attempt blocked (polling or webhook). Detect regressions and webhook vs polling conflicts. */
  statusDowngradeBlocked(data: {
    order_id: string;
    source: 'polling' | 'webhook';
    current_internal_status: string;
    attempted_internal_status: string;
    provider_status?: string;
  }) {
    console.log(
      JSON.stringify({
        ...data,
        level: 'warn',
        message: 'status_downgrade_blocked',
        timestamp: new Date().toISOString(),
      })
    );
  },

  /** Runtime: notification function invoked for this order/status. */
  emailTriggeredForOrder(data: { order_id: string; status: string }) {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'email_triggered_for_order',
        timestamp: new Date().toISOString(),
        source: 'notifications',
        ...data,
      })
    );
  },

  /** Step 1 proof: provider response from GET payment (provider sees the payment). */
  providerPaymentSeen(data: {
    provider_payment_id_suffix: string;
    provider_payment_status: string;
    provider_pay_address_masked: string;
    provider_pay_currency: string;
  }) {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'provider_payment_seen',
        timestamp: new Date().toISOString(),
        source: 'payment_runtime',
        ...data,
      })
    );
  },

  /** Step 3 proof: single record that polling uses same payment_id and env. Reject if mismatch. */
  pollingConsistencyCheck(data: {
    order_id: string;
    stored_payment_id: string;
    polling_payment_id_used: string;
    polling_base_url: string;
    payment_creation_base_url: string;
    mode: string;
    rejected: boolean;
    reject_reason?: string;
  }) {
    console.log(
      JSON.stringify({
        level: data.rejected ? 'warn' : 'info',
        message: 'polling_consistency_check',
        timestamp: new Date().toISOString(),
        source: 'payment_runtime',
        ...data,
      })
    );
  },

  /** Runtime: polling request (which base URL and mode are used). */
  pollingRequest(data: {
    polling_base_url: string;
    mode: string;
    api_key_prefix: string;
    payment_id_suffix: string;
  }) {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'polling_request',
        timestamp: new Date().toISOString(),
        source: 'payment_runtime',
        ...data,
      })
    );
  },

  /** Runtime verification: admin checked payment on provider vs DB. */
  runtimeVerification(data: {
    order_id: string;
    payment_id_suffix: string;
    provider_status: string | null;
    db_internal_status: string;
    payment_mode: string;
    provider_base_url: string;
    match: boolean;
  }) {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'runtime_verification',
        timestamp: new Date().toISOString(),
        source: 'payment_runtime',
        ...data,
      })
    );
  },

  maskPaymentId,
  maskAddress,
};
