# Payment Status Flow: Deposit Address → DB → Frontend

This document traces the full path from deposit address generation to how the payment status component updates, and identifies where the "broken" link may be.

---

## 1. Deposit address generation

**Entry:** User submits exchange in `ExchangeWidget` → `POST /api/payment` with `order_id`, amounts, destination, etc.

**Flow:**
- `app/api/payment/route.ts`: Validates request, gets limits from NOWPayments, builds `paymentParams` including **`ipn_callback_url = PUBLIC_BASE_URL + "/api/webhook/nowpayments"`**.
- Calls `createPayment(paymentParams)` in `lib/nowpayments.ts`, which POSTs to NOWPayments `/payment` with `ipn_callback_url`. NOWPayments returns **`pay_address`** (deposit address) and **`payment_id`**.
- Route then calls **`createOrderWithHistoryTransaction()`** with `internalStatus: 'NEW'`, `fromAddress: payment.pay_address`, and stores `order_id`, `payment_id`, etc. in the DB.

**Result:** Order exists in DB with `internal_status = 'NEW'`, `user_status = 'Awaiting deposit'`, `from_address` = deposit address. Frontend redirects to `/order/[orderId]` and gets this data via `GET /api/order/[id]`.

---

## 2. Backend sync: entry point for payment confirmation

**Entry point:** **`POST /api/webhook/nowpayments`** — the only place that updates order status from payment events.

**Is it real on-chain data or a placeholder?**  
**Real.** NOWPayments monitors the blockchain for incoming payments to the deposit address. When they detect a payment (or confirmations), they send an **IPN (Instant Payment Notification)** to our `ipn_callback_url`. The webhook receives **real provider status** (`payment_status`: e.g. `waiting`, `confirming`, `confirmed`, `finished`, `failed`, `expired`). We do not poll the chain ourselves; NOWPayments does and notifies us. The handler is a full implementation, not a stub.

**Webhook handler flow** (`app/api/webhook/nowpayments/route.ts`):

1. **Raw body** — `await request.text()` (required for signature).
2. **Parse JSON** — require `payment_id`, `payment_status` (400 if missing).
3. **Resolve order** — `getOrderByPaymentId(paymentId)` to get `payment_mode` (live/sandbox) for choosing the correct IPN secret.
4. **Signature verification** — Header `x-nowpayments-sig` (or `x-nowpayments-signature` or `signature`). HMAC-SHA512(rawBody, IPN_SECRET). If secret is set and signature missing/invalid → **401** (webhook rejected; DB not updated).
5. **Map status** — `mapProviderStatusToInternal(payment_status)` → internal status (e.g. `confirming` → CONFIRMING, `finished`/`success` → DONE).
6. **Atomic update** — `processWebhookStatusUpdateAtomic(...)` (idempotency + order update + history in one DB transaction). On success, order row and `order_status_history` are updated.

**Why payment success might not hit the DB:**

| Cause | What happens |
|-------|----------------|
| **Webhook not reachable** | `PUBLIC_BASE_URL` is localhost or wrong; or firewall/Vercel not allowing POST. NOWPayments cannot call our URL → no status update. |
| **Signature verification fails (401)** | Wrong or missing `NOWPAYMENTS_IPN_SECRET` / `NOWPAYMENTS_IPN_SECRET_LIVE` (or sandbox secret); or header/body format mismatch. We return 401 and do not update the DB. |
| **Order not found (503)** | Replica lag or race: webhook arrives before order is visible. We persist to `webhook_orphans` and return 503 so provider can retry. |
| **Transaction error (500)** | DB or RPC failure inside `processWebhookStatusUpdateAtomic`. NOWPayments may retry. |

---

## 3. Status lifecycle (order states)

**Internal statuses** (`lib/status-mapping.ts`):

- **NEW** → user: "Awaiting deposit"
- **AWAITING_DEPOSIT** → "Awaiting deposit"
- **CONFIRMING** → "Deposit received"
- **PAYMENT_CONFIRMED** → "Exchanging"
- **PROCESSING_BY_PROVIDER** → "Exchanging"
- **MANUAL_REVIEW** → "Exchanging"
- **DONE** → "Completed"
- **FAILED** / **EXPIRED** → "Failed" / "Expired"

**Provider → internal mapping (webhook):**

`waiting`→AWAITING_DEPOSIT, `confirming`→CONFIRMING, `confirmed`/`partially_paid`→PAYMENT_CONFIRMED, `sending`→PROCESSING_BY_PROVIDER, `finished`/`success`→DONE, `failed`→FAILED, `expired`/`refunded`→EXPIRED.

**Initial state:** Order is created with **NEW**. It only moves to CONFIRMING / PAYMENT_CONFIRMED / DONE when:

1. **Webhook** receives an IPN and runs `processWebhookStatusUpdateAtomic`, or  
2. **Sandbox:** On `GET /api/order/[id]`, `maybeApplySandboxSimulation()` can apply the sandbox outcome (same atomic update path) so the page updates without a real webhook, or  
3. **Admin / reconciliation:** Manual status change or cron reconciliation (same atomic update path).

So if the webhook is never called (unreachable or 401) or fails (500), the order stays in NEW and payment success never "hits" the database.

---

## 4. Frontend reactivity

**Component:** `app/order/[id]/page.tsx` (client component).

**Data source:** **`GET /api/order/[id]`** only. No WebSockets, no SWR; **polling** only.

**Current behavior:**

- **Initial fetch** on mount via `fetchOrder()`.
- **Polling:** Every **3 seconds** while status is NEW or AWAITING_DEPOSIT (faster feedback when user pays); **6 seconds** for other non-final states. Implemented with `setInterval(fetchOrder, …)` and a second effect that adjusts the interval when `order?.internalStatus` changes.
- **Visibility:** On `document.visibilitychange` to `visible`, calls `fetchOrder()` once.
- **Stop polling** when `internalStatus` is `DONE`, `FAILED`, or `EXPIRED`.
- **State update:** Every successful response overwrites `order` with API data (no "skip if unchanged"); so when the DB is updated by the webhook, the next poll (within 3–6s) shows the new status.

So the frontend **does** re-fetch and will show DB changes; the delay is at most one polling interval (3s when awaiting deposit, 6s otherwise). Implemented details:

- **useCallback(fetchOrder, [orderId])** so the effect dependency is correct and the interval always uses the current fetch logic.
- **3s polling** while status is NEW or AWAITING_DEPOSIT so payment confirmation appears sooner; **6s** for CONFIRMING and beyond until final.

---

## 5. The "broken" link: diagnosis

**Two main possibilities:**

1. **Webhook path (signature or reachability)**  
   - **Signature:** If `NOWPAYMENTS_IPN_SECRET` (or `_LIVE` / `_SANDBOX`) is wrong or missing, or NOWPayments uses a different body format (e.g. sorted JSON), we return **401** and never update the DB. Check server logs for "Invalid webhook signature" or "Signature required".  
   - **Reachability:** If the app runs on localhost or `PUBLIC_BASE_URL` is not the URL NOWPayments can reach, the webhook is never called. Use a tunnel (e.g. ngrok) for local testing, and ensure production URL is set in env and that NOWPayments uses the same callback URL.

2. **Frontend not re-fetching**  
   - The page **does** poll every 6s (and now 3s when awaiting deposit). So if the DB is updated, the UI will update within one interval. If the UI never updates after payment, the problem is almost certainly that the **DB is never updated** — i.e. the webhook is not succeeding (401/503/500 or not called).

**Quick checks:**

- **Logs:** After a test payment, look for "NOWPAYMENTS WEBHOOK HANDLER HIT" and "Webhook processed successfully". If you see "Invalid webhook signature" or "Signature required", fix the IPN secret or signature method.
- **DB:** Query `orders` and `order_status_history` for the `order_id` / `payment_id` after payment. If `internal_status` stays NEW, the webhook did not successfully run.
- **Sandbox:** In sandbox mode, the order page applies simulated outcome on fetch after a short delay, so the status can update without any webhook; that confirms the frontend and API path work when the DB is updated.

---

## 6. File reference

| Step | File(s) |
|------|--------|
| Create payment + deposit address | `app/api/payment/route.ts`, `lib/nowpayments.ts` |
| Create order in DB | `lib/db-orders.ts` (`createOrderWithHistoryTransaction`) |
| Webhook entry | `app/api/webhook/nowpayments/route.ts` |
| Signature verification | Same file, `verifyWebhookSignature(rawBody, signature, secret)` |
| Status mapping | `lib/status-mapping.ts` (`mapProviderStatusToInternal`, `getUserFacingStatus`) |
| Atomic DB update | `lib/db-orders.ts` (`processWebhookStatusUpdateAtomic`), RPC `process_webhook_status_update` |
| Sandbox simulation on fetch | `lib/sandbox-simulation.ts`; applied in `app/api/order/[id]/route.ts` |
| Order API (source of truth for UI) | `app/api/order/[id]/route.ts` |
| Order page + polling | `app/order/[id]/page.tsx` |
| IPN secrets | `lib/env.ts` (`getNowPaymentsLiveIpnSecret`, `getNowPaymentsSandboxIpnSecret`) |
