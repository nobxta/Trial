# NOWPayments Integration Audit

**See also:** [Real Payment Flow Analysis](./REAL_PAYMENT_FLOW_ANALYSIS.md) — full runtime behavior, call chains, admin behavior, funds movement, root causes for "paid but site still Waiting", and loophole scan.

This document verifies the MintMove integration against the **official NOWPayments API** payment flow ([API reference](https://documenter.getpostman.com/view/7907941/2s93JusNJt)) and IPN (Instant Payment Notification) requirements.

---

## 1. Payment Creation

### Official flow

- **Endpoint:** `POST https://api.nowpayments.io/v1/payment` (live) or `POST https://api-sandbox.nowpayments.io/v1/payment` (sandbox).
- **Headers:** `x-api-key`, `Content-Type: application/json`.
- **Body:** Must include `price_amount`, `price_currency`, `pay_currency`. Optional: `order_id`, `order_description`, `ipn_callback_url`, `payout_address`, `payout_currency`, etc.

### Our implementation

| Requirement | Status | Location |
|-------------|--------|----------|
| `POST /v1/payment` | ✅ | `lib/nowpayments.ts` – `createPayment()` uses `config.baseUrl` (live: `getNowPaymentsApiUrl()` → `https://api.nowpayments.io/v1`, sandbox: `https://api-sandbox.nowpayments.io/v1`). |
| `x-api-key` header | ✅ | Same file – `'x-api-key': config.apiKey`. |
| `ipn_callback_url` | ✅ | `app/api/payment/route.ts` – Set to `${getPublicBaseUrl()}/api/webhook/nowpayments` for both exchange and payment flows. Rejected if `PUBLIC_BASE_URL` is unset or localhost in production. |
| `order_id` | ✅ | Passed in `paymentParams.order_id` (from `body.order_id` or fallback to `payment.order_id` after create). |
| `price_amount`, `price_currency`, `pay_currency` | ✅ | Set from request body and validated. |
| `payment_id` stored in DB | ✅ | `createOrderWithHistoryTransaction` receives `paymentId: payment.payment_id` and stores it in `orders.payment_id`. |

**Structured logging:** After each successful `createPayment`, we log `payment_created` with `order_id`, masked `payment_id_suffix`, `ipn_callback_url_set`, and `mode` (see `lib/payment-logger.ts`).

---

## 2. Webhook (IPN) Implementation

### Official flow (NOWPayments IPN)

1. **Callback URL:** Must be publicly reachable; set in dashboard and/or per payment via `ipn_callback_url`.
2. **Signature:** Header `x-nowpayments-sig` contains HMAC-SHA-512 of the **sorted** (alphabetically by key) JSON body, using the **IPN Secret Key**.
3. **Server must:** Read raw POST body, sort JSON keys, compute HMAC-SHA-512 with IPN secret, compare with `x-nowpayments-sig`. Return **HTTP 200** for success so NOWPayments does not retry.

References: [IPN and how to setup](https://nowpayments.zendesk.com/hc/en-us/articles/21395546303889-IPN-and-how-to-set-up), [What is IPN?](https://nowpayments.io/help/what-is/what-is-ipn).

### Our implementation

| Requirement | Status | Location |
|-------------|--------|----------|
| Publicly accessible endpoint | ✅ | `POST {PUBLIC_BASE_URL}/api/webhook/nowpayments`. Production env forbids localhost; URL is set at payment creation. |
| Returns HTTP 200 OK on success | ✅ | `app/api/webhook/nowpayments/route.ts` – Success path returns `NextResponse.json(..., { status: 200 })`. |
| Raw POST body for signature | ✅ | `const rawBody = await request.text()` before parsing. Signature is verified using both **raw body** and **canonical (sorted) body** to support either format from NOWPayments. |
| Sorted JSON keys (canonical) | ✅ | `buildCanonicalBodyForSignature(payload)` uses `sortObject()` (recursive alphabetical key sort). |
| HMAC SHA-512 with IPN Secret | ✅ | `verifyWebhookSignature(bodyToHash, signature, secret)` – `crypto.createHmac('sha512', secret)`, `.update(bodyToHash)`, `.digest('hex')`. |
| Compare with `x-nowpayments-sig` | ✅ | Header read from `x-nowpayments-sig` or `x-nowpayments-signature` or `signature`. |
| Correct secret (live vs sandbox) | ✅ | Order is loaded by `payment_id` to get `payment_mode`; then `getNowPaymentsLiveIpnSecret()` or `getNowPaymentsSandboxIpnSecret()` is used. |
| `payment_id` normalized to string | ✅ | `paymentId = String(paymentIdRaw)` so DB lookup works when NOWPayments sends a number. |

**Structured logging:** We log `webhook_response` with `status` (200, 400, 401, 503, 500) and `event` (e.g. `webhook_completed`, `signature_invalid`, `order_not_found`). Webhook handler also uses `webhookLogger` for `webhook_received`, `signature_verified`, `signature_missing`, `signature_invalid`, `order_not_found`, `webhook_completed`, `webhook_error`.

**If webhook is “never detected”:**

1. **Reachability:** Ensure `PUBLIC_BASE_URL` in production is your real domain (e.g. `https://mintmove.io`). If it is localhost or wrong, NOWPayments cannot POST to your server.
2. **Signature 401:** Ensure `NOWPAYMENTS_IPN_SECRET_LIVE` (or `NOWPAYMENTS_IPN_SECRET`) exactly matches the IPN Secret Key in the NOWPayments dashboard (Merchant → IPN Settings). Check logs for `webhook_response` with `status: 401` and `event: signature_missing` or `signature_invalid`.
3. **503 Order not found:** Logs will show `event: order_not_found`. Confirm `payment_id` in the callback matches the one stored in `orders.payment_id` (we normalize to string). If the webhook arrives before the order is committed (e.g. replica lag), NOWPayments may retry.

---

## 3. Polling Implementation

### Official flow

- **Endpoint:** `GET https://api.nowpayments.io/v1/payment/{payment_id}` (live) or sandbox equivalent.
- **Headers:** `x-api-key`.
- **Response:** JSON with `payment_status` (e.g. `waiting`, `confirming`, `finished`, `failed`, `expired`).

### Our implementation

| Requirement | Status | Location |
|-------------|--------|----------|
| `GET /v1/payment/{payment_id}` | ✅ | `lib/nowpayments.ts` – `getPaymentStatus(paymentId, mode)` calls `${config.baseUrl}/payment/${paymentId}` with GET. |
| Correct `x-api-key` | ✅ | Uses live or sandbox API key based on `mode` (from order’s `payment_mode` when available). |
| Correct `payment_id` | ✅ | All callers use the order’s `payment_id` from DB; we normalize to string (e.g. `String(currentOrder.payment_id)` in admin resync). |
| Response status parsed and written to DB | ✅ | Status is mapped via `mapProviderStatusToInternal()` and applied via `processWebhookStatusUpdateAtomic()` (same path as webhook) in: order GET poll, cron reconciliation, admin resync. |

**Where polling runs:**

1. **Order page:** `GET /api/order/[id]` – For orders in NEW/AWAITING_DEPOSIT/CONFIRMING, we sync from NOWPayments at most once every 15 seconds and update DB + send notification if status changed.
2. **Cron:** `GET /api/cron/reconcile-orders` – Runs every 5 minutes (see `vercel.json`), finds orders stuck in NEW/AWAITING_DEPOSIT/CONFIRMING for 15+ minutes (and paid-but-not-DONE for 25+ minutes), calls `getPaymentStatus` and `processWebhookStatusUpdateAtomic`, and sends notifications.
3. **Admin “Re-sync Status”:** Calls `getPaymentStatus(order.payment_id, order.payment_mode)` then `updateOrderStatus` and `notifyOrderStatus` when status changes.

**Structured logging:**  
- `GET /api/payment?payment_id=...` logs `payment_status_poll` with masked `payment_id_suffix`, `mode`, `response_status`, and `ok`.  
- Reconciliation and order GET poll use `paymentDetectionLog` / `orderPollLog` with `source: reconciliation` and `source: order_get_poll`.

---

## 4. Status Update and Email Trigger

| Requirement | Status | Location |
|-------------|--------|----------|
| Order status updated in DB when status becomes `finished` (or equivalent) | ✅ | Webhook and all polling paths use `processWebhookStatusUpdateAtomic()`, which updates `orders` and `order_status_history`. Provider status `finished`/`success` maps to internal `DONE`. |
| Email notification on status change | ✅ | After a successful status update, we call `notifyOrderStatus(userId, orderId, status)` for CONFIRMING, PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, DONE, EXPIRED – in webhook handler, order GET poll, reconciliation, and admin resync. |
| Email send result logged | ✅ | `paymentLogger.emailAttempt({ order_id, status, success, error? })` is called in `notifyOrderStatus()` after each send attempt. |

---

## 5. Logging Summary

Structured logs (JSON) are emitted for:

| Event | Source | Fields (no PII) |
|-------|--------|------------------|
| Payment created | `payment_api` | `order_id`, `payment_id_suffix` (masked), `ipn_callback_url_set`, `mode` |
| Payment status poll | `payment_api` | `payment_id_suffix`, `mode`, `response_status`, `ok` |
| Webhook response | `webhook` | `status` (200/400/401/503/500), `event` |
| Webhook details | `webhookLogger` | `event`: `webhook_received`, `signature_verified`, `signature_invalid`, `order_not_found`, `webhook_completed`, etc. |
| Reconciliation | `reconciliation` | `reconciliation_start`, `reconciliation_status_updated`, `reconciliation_get_status_failed`, etc. |
| Order GET poll sync | `order_get_poll` | `order_poll_sync_updated`, `order_poll_sync_error` |
| Email attempt | `notifications` | `order_id`, `status`, `success`, `error?` |

In production (e.g. Vercel), filter logs by `source` or `message` to trace payment creation → webhook/polling → status update → email.

---

## 6. Checklist for “Payment never detected”

- [ ] **PUBLIC_BASE_URL** is your live domain (e.g. `https://mintmove.io`), not localhost.
- [ ] **NOWPAYMENTS_IPN_SECRET_LIVE** (or **NOWPAYMENTS_IPN_SECRET**) matches the IPN Secret in NOWPayments dashboard exactly.
- [ ] Logs show `webhook_received` → if not, the callback URL is not reachable (firewall, wrong URL, or dashboard URL different from `ipn_callback_url` sent at payment creation).
- [ ] If logs show `webhook_received` then `signature_invalid` or `signature_missing`, fix the IPN secret or header.
- [ ] If logs show `order_not_found`, confirm the same `payment_id` is stored in `orders` (and that we normalize to string).
- [ ] Cron: ensure `/api/cron/reconcile-orders` runs every 5 minutes (Vercel cron or external scheduler with `Authorization: Bearer CRON_SECRET`).
- [ ] Order page polling: user keeps the order page open so `GET /api/order/[id]` runs; after 15s we sync from NOWPayments and update DB + send email.
- [ ] Admin “Re-sync Status” uses the same `getPaymentStatus` + `updateOrderStatus` + `notifyOrderStatus`; confirm no 4xx/5xx from the actions API.

This audit confirms the implementation follows the **official NOWPayments payment and IPN flow**. If payments still do not move from `pending` to `finished`, use the logs above to see whether the failure is webhook reachability, signature, order lookup, or polling/cron not running.

---

## 7. Runtime verification (deep debugging)

When payments are still never detected, use the following to isolate the failure.

### 7.1 Verify payment exists on NOWPayments

- **Admin endpoint:** `GET /api/admin/orders/[order_id]/verify-payment-runtime` (requires admin operator).
- Calls `GET https://api.nowpayments.io/v1/payment/{payment_id}` (or sandbox) using the order’s `payment_mode` and returns:
  - **provider:** full raw response from NOWPayments (`payment_status`, etc.).
  - **db:** current order `internal_status`, `payment_mode`, `payment_id`.
  - **verification:** `match` (whether provider status maps to current DB status), `provider_base_url`, `mode`.
- **Interpretation:**
  - If the request fails (502): wrong env (e.g. live key for sandbox `payment_id`) or invalid `payment_id`.
  - If provider shows `waiting`/`confirming`/`finished` but DB is still `NEW`: polling/webhook path is not updating the DB.
  - If provider returns “not found”: creation may have used sandbox while you are querying live (or vice versa).

### 7.2 Environment consistency logs

- **At payment creation:** `message: "env_consistency"` with `payment_creation_base_url`, `polling_base_url`, `mode`, `api_key_prefix` (first 4 chars). Creation and polling use the same config per mode.
- **At each GET payment status:** `message: "polling_request"` with `polling_base_url`, `mode`, `api_key_prefix`, `payment_id_suffix`.
- **Check:** `payment_creation_base_url` and `polling_base_url` should match for the same mode (e.g. both `https://api.nowpayments.io/v1` for live). If creation used sandbox and polling uses live (or vice versa), fix `payment_mode` on the order or env.

### 7.3 Webhook runtime logs

- **Every request:** `message: "webhook_request_received"` with `remote_ip`, `timestamp`. If you never see this during a real payment, callbacks are not reaching the server (wrong `ipn_callback_url`, firewall, or wrong account).
- **On signature failure:** `message: "webhook_signature_mismatch"` with `received_signature`, `calculated_signature_raw`, `calculated_signature_canonical`, `payload_hash_sha256`, `payment_mode`. Use these to confirm why verification failed.

### 7.4 Polling scheduler logs

- **Cron:** `message: "poll_job_started"` with `job_type: "cron_reconcile"`. If this never appears, the cron is not running (check Vercel cron or external scheduler and `CRON_SECRET`).
- **Order page poll:** `message: "poll_job_started"` with `job_type: "order_get_poll"` when the order GET runs a provider sync.
- **Per order:** `payment_id_checked` (which `payment_id` suffix is queried), `provider_status_returned` (what NOWPayments returned), `db_status_updated` (when the DB was updated). If `provider_status_returned` is always null/empty, the wrong `payment_id` may be used or the provider returned an error.

### 7.5 Email trigger logs

- **When notification is invoked:** `message: "email_triggered_for_order"` with `order_id`, `status`. If this never appears after a status change, the notification function was not called (e.g. status mapping or flow skipped it).
- **After send attempt:** `message: "email_attempt"` with `order_id`, `status`, `success`, optional `error`. Use this to confirm send success or SMTP/API failure.

---

## 8. Mandatory runtime proof test

Use these steps to identify the **exact failing stage** when payments are never detected.

### Step 1 — Confirm provider sees the payment

After a real payment, check logs for **`provider_payment_seen`** (emitted on every successful GET payment response):

- `provider_payment_id_suffix`, `provider_payment_status`, `provider_pay_address_masked`, `provider_pay_currency`

If NOWPayments does **not** show the transaction when you call `GET https://api.nowpayments.io/v1/payment/{payment_id}` with your production API key, the creation flow is hitting the wrong environment (sandbox vs live). Use **`env_consistency`** and **`payment_created`** logs at creation to confirm which base URL and mode were used.

### Step 2 — Confirm webhook delivery

Search logs for **`webhook_request_received`** (timestamp, remote_ip). If **zero** entries appear during real payments, the callback URL is wrong or unreachable.

At payment creation we log **`ipn_callback_url_used`** (exact URL sent to NOWPayments). Verify it resolves publicly:

```bash
curl -X GET https://mintmove.io/api/webhook/nowpayments
# Expect: "WEBHOOK OK" or similar
```

### Step 3 — Confirm polling uses the same payment

For each poll we log **`polling_consistency_check`** in a single record:

- `order_id`, `stored_payment_id`, `polling_payment_id_used`, `polling_base_url`, `payment_creation_base_url`, `mode`, `rejected`

If `stored_payment_id !== polling_payment_id_used`, polling is **rejected** and we log `rejected: true` and `reject_reason`. Polling will not call the provider for that order when rejected.

### Step 4 — Force manual reconciliation test

**POST /api/admin/orders/[id]/force-provider-sync** (admin operator):

1. Calls NOWPayments `GET payment/{payment_id}` with the order’s `payment_mode`.
2. Logs the **full raw provider response** (`force_provider_sync_raw_response`).
3. Calls **processWebhookStatusUpdateAtomic()** immediately.
4. Triggers **notifyOrderStatus** if status changed to a notify-worthy state.
5. Returns: **old_internal_status**, **provider_status**, **new_internal_status**, **already_processed**, **raw_provider_response**.

If the provider returns `finished` but **new_internal_status** is unchanged (and `already_processed` is false), the bug is in the DB transition / RPC logic. If **new_internal_status** becomes DONE, the update path works and the failure is earlier (webhook not reaching server or polling not running / rejected).

### Step 5 — Root cause classification

After the above tests, classify the failure as one of:

| Classification | What to check | Fix |
|----------------|----------------|-----|
| **Environment mismatch** | Payment created in sandbox but polled in live (or vice versa). | Ensure `payment_mode` on the order matches the env used at creation. Logs: `payment_created` (mode), `polling_consistency_check` (mode, base URLs). |
| **Webhook never reaching server** | No `webhook_request_received` when user pays. | Fix `PUBLIC_BASE_URL` / `ipn_callback_url_used`; ensure firewall and NOWPayments account use the same URL; verify with curl. |
| **Polling querying wrong payment_id** | `polling_consistency_check` shows mismatch or `rejected: true`. | Code rejects when stored ≠ polling; ensure order has correct `payment_id` and no middle layer overwrites it. |
| **Status mapping or DB transition blocking update** | `force-provider-sync` returns provider `finished` but `new_internal_status` unchanged. | Inspect RPC `process_webhook_status_update` and status transition rules; ensure DONE is allowed from current state. |
| **Notification before DB update** | Email triggered but order not updated. | Ensure all paths call **processWebhookStatusUpdateAtomic** first, then **notifyOrderStatus** only after a successful status change. |

### Guarantee: finished → DB update and notification

Once NOWPayments returns **finished** (or **success**):

1. **Webhook path:** POST to `/api/webhook/nowpayments` → signature verified → **processWebhookStatusUpdateAtomic** → order updated → **notifyOrderStatus** for DONE. No cron or page poll required.
2. **Polling path (order page):** GET `/api/order/[id]` runs a provider sync (throttled 15s) → **processWebhookStatusUpdateAtomic** → **notifyOrderStatus**. Same atomic update and notification.
3. **Cron path:** Reconciliation runs every 5 minutes → **processWebhookStatusUpdateAtomic** → **notifyOrderStatus**.
4. **Admin:** **POST force-provider-sync** or **Re-sync Status** both call the same atomic update and notification.

So the system **does** update DB and trigger notification as soon as we receive `finished` from the provider (via webhook or any poll). If it still does not in production, the runtime proof test above identifies which of: wrong env, webhook unreachable, wrong payment_id, or DB transition is blocking.
