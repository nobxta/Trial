# Deep Codebase Analysis — Real User Payment Flow (NOWPayments)

This document describes the **actual runtime behavior** of the MintMove payment/exchange system as implemented in the codebase, not documentation assumptions.

**See also:** [Manual vs Automatic Payout Audit](./MANUAL_VS_AUTOMATIC_PAYOUT_AUDIT.md) — how payout mode is (or isn’t) used at payment creation and in webhook/polling/cron.

---

## 1. Real User Flow (Step-by-Step)

### 1.1 User selects crypto and creates exchange

**Frontend:** `components/ExchangeWidget.tsx` (or `ExchangeWidgetNew.tsx`)

- User picks send asset, receive asset, amount, rate type (fixed/float), and **destination** (receive wallet address).
- On "Continue", the widget builds a payload with `type: "exchange"`, `send_asset`, `send_amount`, `receive_asset`, `expected_receive`, `destination` (and `payout_address`), `order_id` (client-generated UUID), `price_amount` (USD value), `price_currency: 'usd'`, `pay_currency`, `payout_currency`, etc.
- It calls **`POST /api/payment`** with that body.

**Backend:** `app/api/payment/route.ts`

- Branch **`isExchange = body.type === "exchange" || body.send_asset`** is taken.
- Validates with `validateExchangeRequest(body)`, checks min/max via **NOWPayments** `getExchangeLimits()`, then builds **`paymentParams`**:
  - `price_amount`, `price_currency`, `pay_currency`, `order_id`, `order_description`
  - **`payout_address: body.destination`**, **`payout_currency: body.receive_asset`**
  - **`ipn_callback_url = ${getPublicBaseUrl()}/api/webhook/nowpayments`**
- Calls **`createPayment(paymentParams)`** in `lib/nowpayments.ts` → **`POST https://api.nowpayments.io/v1/payment`** (or sandbox) with `x-api-key`.
- NOWPayments returns `payment_id`, `pay_address` (deposit address), `pay_currency`, etc.
- Backend then runs **`createOrderWithHistoryTransaction()`** (`lib/db-orders.ts` → RPC `create_order_with_history`) to insert one row into **`orders`** with:
  - `order_id`, **`payment_id`** (from NOWPayments), **`payment_mode`** (live/sandbox), `internal_status: 'NEW'`, amounts, `from_address: pay_address`, etc.
- Response returns the payment/order payload; frontend stores in localStorage and **`router.push(\`/order/${orderId}\`)`**.

So the system creates **one NOWPayments payment request** (deposit address + QR) **and** records the order in the DB. The "swap" is defined by `payout_address` and `payout_currency` sent to NOWPayments at creation; there is no separate "swap request" API call later.

---

### 1.2 User pays the displayed address

User sends crypto to the address returned by NOWPayments (`pay_address`). NOWPayments tracks the deposit and later performs the conversion and payout to `payout_address`.

---

### 1.3 How the system detects the payment

Detection is **only** by:

1. **Webhook (IPN)**  
   - **Endpoint:** `POST {PUBLIC_BASE_URL}/api/webhook/nowpayments`  
   - **File:** `app/api/webhook/nowpayments/route.ts`  
   - NOWPayments POSTs here on status changes. Handler: reads raw body, parses JSON, gets `payment_id` (normalized to string), loads order with **`getOrderByPaymentId(paymentId)`** (`lib/db-orders.ts`), selects live/sandbox IPN secret by `order.paymentMode`, verifies signature (raw or canonical body), then maps `payment_status` with **`mapProviderStatusToInternal()`** (`lib/status-mapping.ts`: `waiting`→AWAITING_DEPOSIT, `confirming`→CONFIRMING, `finished`/`success`→**DONE**, etc.) and calls **`processWebhookStatusUpdateAtomic()`** (`lib/db-orders.ts`).  
   - **Exact function where status is applied:** **`processWebhookStatusUpdateAtomic()`** → Supabase RPC **`process_webhook_status_update`** (`supabase/migrations/044_webhook_guard_final_states.sql`). The RPC inserts into `webhook_idempotency`, then **UPDATEs `orders`** (`internal_status`, `user_status`, `status`, `status_source`, `provider_status`, hashes, `updated_at`). Final states (DONE, FAILED, EXPIRED) are never overwritten (guard in RPC).

2. **Order page polling (backend sync)**  
   - **File:** `app/api/order/[id]/route.ts` (GET)  
   - User has order page open; frontend **`fetch(\`/api/order/${orderId}\`)`** every 3–6 s (`app/order/[id]/page.tsx`, `fetchOrder`, `setInterval`).  
   - GET handler loads order with **`getOrderByOrderId()`**. If order is in NEW/AWAITING_DEPOSIT/CONFIRMING and `updated_at` is older than 15 s, it calls **`getPaymentStatus(paymentId, order.paymentMode)`** then **`processWebhookStatusUpdateAtomic()`** with the same params as webhook, then **`notifyOrderStatus()`** if status changed. So the **same RPC** updates the DB when the order page triggers a sync.

3. **Cron reconciliation**  
   - **File:** `app/api/cron/reconcile-orders/route.ts`  
   - **Scheduler:** `vercel.json` → **`*/5 * * * *`** (every 5 minutes).  
   - Handler calls **`runOrderReconciliation()`** (`lib/order-reconciliation.ts`): **`findStaleOrders()`** (NEW/AWAITING_DEPOSIT/CONFIRMING, not updated for 15+ min), then for each order **`getPaymentStatus()`** and **`processWebhookStatusUpdateAtomic()`** (same RPC). Second pass: **`findStalePaidOrders()`** (PAYMENT_CONFIRMED/MANUAL_REVIEW/PROCESSING_BY_PROVIDER, 25+ min) and if provider returns `finished`/`success`, again **`processWebhookStatusUpdateAtomic()`** with DONE.

4. **Admin actions**  
   - **Re-sync:** `app/api/admin/orders/[id]/actions/route.ts` (action `resync`) → **`getPaymentStatus()`** then **`updateOrderStatus()`** (not the RPC; direct UPDATE).  
   - **Force-provider-sync:** `app/api/admin/orders/[id]/force-provider-sync/route.ts` (POST) → **`getPaymentStatus()`** then **`processWebhookStatusUpdateAtomic()`** then **`notifyOrderStatus()`** if needed.

So status is **processed** in:

- **`processWebhookStatusUpdateAtomic()`** → RPC **`process_webhook_status_update`** (webhook, order GET sync, cron, force-provider-sync)
- **`updateOrderStatus()`** (admin resync only)

---

### 1.4 When payment becomes `finished` at NOWPayments

- **Exchange/payout:** The **exchange (swap) and payout are performed by NOWPayments**. We send `payout_address` and `payout_currency` at **payment creation**. When NOWPayments marks the payment as `finished`, they have (or are) sending the converted funds to that address. **We do not call any extra API to "execute" the swap**; there is no separate swap/payout call in our code.
- **Our side:** We only **update DB and send notifications**. When we receive `finished` (via webhook or any of the polling paths above), we call **`processWebhookStatusUpdateAtomic()`** with `internal_status: 'DONE'`. The RPC updates `orders`. We do **not** downgrade DONE to "wait for manual" in the webhook; the comment in `lib/status-mapping.ts` about manual mode is not implemented in the webhook (we always map `finished` → DONE).

So: **the system automatically records the order as paid (DONE)** when NOWPayments reports `finished`. Payout is done by NOWPayments; we do not "wait for manual processing" in code for status update (admin can still use manual payout mode for their own process, but DB still goes to DONE when provider says finished).

---

### 1.5 When and how notifications are triggered

- **Telegram:**  
  - **File:** `app/api/webhook/nowpayments/route.ts`  
  - Only when **status changes to CONFIRMING** and order is **not** sandbox: **`sendTelegramNotification()`** (`lib/telegram.ts`). So one "Swap Hit" per order on first on-chain confirmation.

- **Email:**  
  - **File:** same webhook handler; also in order GET sync, reconciliation, admin resync, force-provider-sync.  
  - After a status change to CONFIRMING, PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, **DONE**, or EXPIRED we call **`notifyOrderStatus(userId, orderId, status, request)`** (`lib/notifications.ts`). That uses idempotency, then **`sendNotification()`** → **`getOrderStatusEmailTemplate()`** and **`sendGenericEmail()`** (`lib/email.ts`). So email is triggered **whenever** one of the above code paths updates the order to one of those statuses (webhook, order GET, cron, admin resync, force-provider-sync).

- **Admin panel status:**  
  - Admin list and detail read **directly from Supabase** `orders` table (`internal_status`, `user_status`, `provider_status`, etc.). No separate "admin status" field. So when **`process_webhook_status_update`** or **`updateOrderStatus`** updates `internal_status`, the admin panel shows it on next load (no cache in code; Next.js may cache server components until revalidate).

**Call chain summary:**

- Webhook: `POST /api/webhook/nowpayments` → `getOrderByPaymentId` → verify signature → `mapProviderStatusToInternal` → **`processWebhookStatusUpdateAtomic`** → RPC `process_webhook_status_update` → then `recordOrderCompletion` (if DONE), `notifyOrderStatus`, `sendTelegramNotification` (if CONFIRMING, live).
- Order GET sync: `GET /api/order/[id]` → `getOrderByOrderId` → (if throttle ok) `getPaymentStatus` → **`processWebhookStatusUpdateAtomic`** → same RPC → **`notifyOrderStatus`**.
- Cron: `runOrderReconciliation` → `findStaleOrders` → `getPaymentStatus` → **`processWebhookStatusUpdateAtomic`** → same RPC → **`notifyOrderStatus`**; second pass for paid-but-not-DONE → same.
- Admin resync: **`updateOrderStatus`** (direct UPDATE) → **`notifyOrderStatus`**.
- Force-provider-sync: **`getPaymentStatus`** → **`processWebhookStatusUpdateAtomic`** → **`notifyOrderStatus`**.

---

## 2. Admin Panel Behavior

- **Data source:** Admin orders list is loaded in **`app/admin/orders/page.tsx`** via **`getOrders()`**, which uses **`supabaseAdmin.from('orders').select('*')`** with filters. Order detail uses **`getOrderByOrderId()`** (same DB).
- **Status shown:** Rows expose **`internal_status`** (and legacy `status`, `user_status`, `provider_status`). Table and filters use **`internal_status`** (e.g. PAYMENT_CONFIRMED, MANUAL_REVIEW, CONFIRMING, DONE, etc.).
- **Admin actions:**  
  - **Re-sync** and **Force-provider-sync** both update the **same** `orders` row (`internal_status`, `user_status`, `status`, `status_source`, `provider_status`, etc.). Resync uses **`updateOrderStatus()`** (application-level state machine). Force-provider-sync uses **`processWebhookStatusUpdateAtomic()`** (RPC, no app-level transition check).  
  - So: same DB columns; resync goes through `updateOrderStatus` (transition rules), force-provider-sync goes through the same RPC as webhook/cron.
- **Why admin might still see "Waiting":**  
  - **No caching layer** in our code for order list/detail; they read from DB.  
  - If the **webhook never runs** (wrong URL, 401, 503), and **cron hasn’t run yet** (runs every 5 min, and only for orders stale 15+ min), and the **user closed the order page** (so no order GET sync), then the DB is never updated. So admin sees **NEW** or **AWAITING_DEPOSIT** until cron or manual action runs.  
  - Delayed reconciliation: first run that can pick the order is 15+ minutes after creation; cron runs every 5 minutes. So there is a window where only webhook or order-page sync can update; if both fail, admin will see Waiting until cron or manual action.

---

## 3. Funds Movement Logic

- **After payment confirmation (NOWPayments side):**  
  - **We do not trigger a swap or send funds ourselves.**  
  - At **payment creation** we already sent **`payout_address`** and **`payout_currency`** to NOWPayments. They are responsible for converting the deposited currency and sending the outcome to that address. When their status becomes `finished`, they have (or are) completing that payout.
- **Exact service:** **NOWPayments** (their backend). Our only calls are:  
  - **`POST /v1/payment`** (create, with `payout_address`, `payout_currency`),  
  - **`GET /v1/payment/{payment_id}`** (status checks).  
  We do not call any "execute swap" or "send payout" API.
- **If we did not send funds:** There is no separate "complete exchange" step in our code. If NOWPayments does not send the payout (e.g. their issue or misconfiguration), that is outside our code. Our code only updates status and notifies; it does not "wait for manual" to set DONE when provider says `finished` (we always map `finished` → DONE in the RPC path).

---

## 4. Root Cause Investigation — "User paid, NOWPayments shows finished, website still shows Waiting"

Possible failure points **from the current code**:

| # | Failure point | Where in code | What to check |
|---|----------------|----------------|----------------|
| 1 | **Webhook received but DB not updated** | Webhook returns 200 only after successful **`processWebhookStatusUpdateAtomic()`**. If RPC throws, we return 500 and log. | Logs: `webhook_request_received` (if no entry, webhook not reaching server). Then `webhook_response` status 401/503/500. If 500, check `webhook_transaction_failed` / RPC errors. |
| 2 | **Webhook not executed or rejected** | Signature: `app/api/webhook/nowpayments/route.ts`. Order lookup: **`getOrderByPaymentId(paymentId)`**. | 401 → `webhook_signature_mismatch` (check IPN secret). 503 → `order_not_found` (check `payment_id` in payload vs DB, and that we normalize to string). |
| 3 | **Polling not executed or rejected** | Order GET: **`app/api/order/[id]/route.ts`** only runs provider sync if order is NEW/AWAITING_DEPOSIT/CONFIRMING and `updated_at` &lt; 15 s ago. Reconciliation: **`findStaleOrders`** only orders **not** updated for **15+ minutes**. **`polling_consistency_check`** rejects if `stored_payment_id !== polling_payment_id_used` (in practice they are the same). | Logs: `poll_job_started` (cron vs order_get_poll). If cron never logs, cron not running. If order GET never does sync, user may have closed the page or throttle (15 s) not met. |
| 4 | **Wrong payment_mode / environment mismatch** | Order is created with **`payment_mode`** (live/sandbox). Webhook and polling use **`order.paymentMode`** to choose API base URL and IPN secret. | If payment was created in **sandbox** but dashboard is checked in **live** (or vice versa), provider may show "no payment" or wrong status. Logs: `payment_created` (mode), `polling_request` / `env_consistency` (base URL, mode). Use **GET /api/admin/orders/[id]/verify-payment-runtime** to compare provider response vs DB. |
| 5 | **Status mapping** | **`mapProviderStatusToInternal`** in `lib/status-mapping.ts`: `finished` and `success` → **DONE**. | No mapping bug for `finished` → DONE. If provider returns something else (e.g. typo), it would map to NEW. Log **`provider_payment_seen`** / **`provider_status_returned`** to see exact provider value. |
| 6 | **Reconciliation job not running** | **`vercel.json`** crons: **`/api/cron/reconcile-orders`** at **`*/5 * * * *`**. Requires **`CRON_SECRET`** in production. | If Vercel cron is disabled or wrong, or **CRON_SECRET** missing/wrong, cron never runs. Log **`poll_job_started`** with `job_type: 'cron_reconcile'`. |
| 7 | **Admin UI reading different column** | Admin reads **`internal_status`** (and legacy `status`) from **`orders`**. No separate "admin status" column. | Same row. If DB has DONE, admin sees it unless list is filtered. Default list filter excludes pure NEW/AWAITING_DEPOSIT unless "Show unpaid" etc. |
| 8 | **Exchange execution waiting on another flag** | We do not have "exchange execution" logic that waits on a flag. DONE is set when provider says `finished`. | N/A. |

**Most likely root causes from code:**

1. **Webhook never reaches the server** (wrong `PUBLIC_BASE_URL` / `ipn_callback_url`, or firewall) → no `webhook_request_received` in logs.  
2. **Webhook reaches but signature fails (401)** → wrong or missing IPN secret for the correct mode (live/sandbox).  
3. **Webhook reaches but order not found (503)** → `payment_id` mismatch (e.g. type or value) so **`getOrderByPaymentId`** returns null.  
4. **Only detection path is cron**, and cron hasn’t run yet for that order (stale threshold 15 min) or cron is not configured / not running.  
5. **Environment mismatch:** payment created in sandbox, but you check live (or vice versa); then "provider shows finished" might be on the other environment.

---

## 5. Deep Loophole Scan

| Issue | Severity | Where | Notes |
|-------|----------|--------|--------|
| **Race: order creation vs webhook** | Medium | Order is inserted in **`createOrderWithHistoryTransaction`** after **`createPayment`**. If NOWPayments sends IPN very fast, webhook can arrive before commit (or before replica is visible). We return **503** and write to **`webhook_orphans`**; NOWPayments may retry. | Mitigation: 503 + retry. Replica lag could still cause occasional 503. |
| **DB/RPC failures not swallowed** | — | **`processWebhookStatusUpdateAtomic`** throws on RPC error; webhook handler catches and returns 500. No silent swallow. | OK. |
| **Status transitions blocking DONE** | Low | **`updateOrderStatus()`** (used by admin resync) uses **`canTransition()`**. So NEW → DONE is **disallowed** in the state machine. But **webhook and cron use the RPC**, which does **not** check transitions; it just UPDATEs. So webhook/cron/force-provider-sync can set DONE from any state. Only **admin resync** uses **`updateOrderStatus`** and can be blocked (e.g. NEW → DONE would be invalid for resync). | For "website still Waiting", the critical path is webhook or order GET sync or cron; all use RPC, so transition rules do not block DONE there. |
| **Sandbox vs live** | High | If **`payment_mode`** is wrong or null, we default to live for webhook secret and to dual-probe (sandbox then live) for polling. So one env can be used at creation and another at poll. | Log **payment_created** (mode) and **polling_request** / **verify-payment-runtime** to confirm same env. |
| **Webhook signature rejecting valid callbacks** | Medium | We verify with **raw** and **canonical** body; if either matches we accept. Possible issue: IPN secret mismatch (e.g. dashboard shows one key, env another), or encoding. | Log **webhook_signature_mismatch** (received vs calculated) when it fails. |
| **Polling skipping orders** | Medium | **polling_consistency_check**: we **reject** (skip provider call) when **`stored_payment_id !== polling_payment_id_used`**. In code we set both from the same `order.paymentId`, so they are always equal. So no skip from this in normal flow. **Order GET** only runs sync if **updated_at** is at least 15 s ago (throttle). **Cron** only considers orders **stale 15+ min**. | So new orders rely on webhook or order-page sync for the first 15 min. |
| **Payment confirmed but exchange never starts** | — | "Exchange" (conversion + payout) is done by **NOWPayments** when they mark `finished`. We don’t start it. If they never mark `finished` or never send payout, that’s on their side. Our code only updates status when provider reports a status. | No loophole in our code for "exchange never starts" once provider says finished. |

**Summary of structural risks:**

- **Replica lag / race:** Webhook can 503 if it hits before order is visible; we persist orphan and return 503 so provider can retry.  
- **No silent RPC swallow:** Errors surface as 500.  
- **DONE updates:** Not blocked by state machine in webhook/cron/order GET path (they use RPC).  
- **Env mismatch:** Possible if `payment_mode` is null or wrong; need to align creation and polling env and verify with runtime logs.  
- **Signature:** Valid callbacks can be rejected only if secret or body format is wrong; we log mismatch.  
- **Polling skips:** Only via consistency check (stored !== polling), which we don’t trigger in normal code, or by throttle/staleness (15 s / 15 min).  
- **Exchange execution:** We do not trigger it; NOWPayments does. So no "payment confirmed but we never start exchange" in our code.

---

## Summary Table

| Question | Answer (from code) |
|----------|--------------------|
| What happens when user selects crypto and continues? | Frontend POSTs to `/api/payment` with `type: "exchange"`, amounts, destination. Backend creates NOWPayments payment (with `payout_address`, `payout_currency`) and inserts order with `payment_id`, `payment_mode`. |
| Does we create a payment request or a separate swap request? | **One NOWPayments payment request** with deposit address and payout params. No separate swap API call later. |
| How is payment detected? | **Webhook** (IPN), **order page GET** (backend sync every 15 s when page open), **cron** (every 5 min, orders stale 15+ min), **admin resync / force-provider-sync**. |
| Where is status processed? | **`processWebhookStatusUpdateAtomic()`** → RPC **`process_webhook_status_update`** (webhook, order GET sync, cron, force-provider-sync). Admin resync uses **`updateOrderStatus()`**. |
| When provider says `finished`, do we auto execute swap? | **We do not execute swap.** NOWPayments does conversion and payout using `payout_address`/`payout_currency` from creation. We only set **DONE** and send notifications. |
| Telegram / email / admin updates? | **Telegram:** webhook only, on first CONFIRMING (live). **Email:** webhook, order GET sync, cron, resync, force-provider-sync when status in [CONFIRMING, …, DONE, EXPIRED]. **Admin:** reads same `orders` row (`internal_status`); no extra cache. |
| Why might admin still see Waiting? | Webhook not reaching (URL/signature), order not found (503), cron not run yet (15 min staleness) or cron not configured, or env mismatch so provider "finished" is in other env. |
| Funds movement? | **NOWPayments** sends payout. We have no "send funds" or "trigger swap" call. |
| Top root causes for "paid but Waiting"? | (1) Webhook not reaching server, (2) Webhook 401 (signature), (3) Webhook 503 (order not found), (4) Cron not running or not yet applicable (15 min), (5) Sandbox vs live mismatch. |

This reflects the **actual runtime behavior** and failure points in the current codebase.
