# MintMove – Full Website Flow & Audit (Code-Based)

This document explains the **entire website** by tracing the code: user flow, admin flow, payment confirmation, time display, email system, NOWPayments webhook, live vs sandbox, and how the admin sees and reacts to payment confirmation. It also flags anything broken or inconsistent.

---

## 1. High-Level Architecture

- **Stack:** Next.js (App Router), Supabase (DB + auth), NOWPayments (payments), Nodemailer (SMTP).
- **Modes:** Payment mode is **live** or **sandbox** (stored in `exchange_settings.payment_mode`). Sandbox uses `api-sandbox.nowpayments.io` and optional `sandbox_case` (success/failed/expired/partially_paid).
- **Webhook:** NOWPayments sends IPN to `PUBLIC_BASE_URL/api/webhook/nowpayments`. Signature verified with **live** or **sandbox** IPN secret (chosen per order via `payment_id` → order → `payment_mode`).

---

## 2. User Flow (Exchange)

### 2.1 Create order

1. **Frontend:** `ExchangeWidget` submits to `POST /api/payment` with `type: "exchange"` (or `send_asset`), plus send/receive assets, amounts, destination, etc.
2. **Payment API** (`app/api/payment/route.ts`):
   - Validates body (`validateExchangeRequest`), checks min/max limits via NOWPayments (`getExchangeLimits`).
   - Reads **payment mode** from DB: `getPaymentMode()` → `exchange_settings.payment_mode` (default `live`).
   - In **sandbox**, reads **sandbox case**: `getSandboxCase()` from `exchange_settings.sandbox_case` (default `success`).
   - Builds `paymentParams` (price, currencies, `order_id`, `payout_address`, etc.). Sets `ipn_callback_url = PUBLIC_BASE_URL + "/api/webhook/nowpayments"`. In sandbox, sets `paymentParams.case = resolvedSandboxCase`.
   - Calls NOWPayments `createPayment(paymentParams)` (live or sandbox API/key from `getNowPaymentsConfig()`).
   - **After** payment is created: `createOrderWithHistoryTransaction(userId, orderData)` — order is created with `internal_status: 'NEW'`, `payment_mode`, `sandbox_case`, `payment_id`, etc. If this fails, the API returns 500 (orphan payment at NOWPayments; no order in DB).
   - Response returns payment details; frontend redirects to `/order/[orderId]`.

### 2.2 Order page

1. **Page:** `app/order/[id]/page.tsx` (client component).
2. **Data:** Polls `GET /api/order/[id]` every 6 seconds.
3. **Order API** (`app/api/order/[id]/route.ts`):
   - Loads order by `orderId` with `getOrderByOrderId(orderId)` (no user check — supports anonymous tracking).
   - **Sandbox:** `maybeApplySandboxSimulation(order)` — if order is sandbox, has `sandbox_case`, and is older than 8 seconds, it applies the outcome (e.g. success → DONE) via `processWebhookStatusUpdateAtomic`, so the UI updates **without** a real webhook (e.g. on localhost).
   - Returns `userStatus`, `internalStatus`, `currentStep` (from `getCurrentStep(internalStatus)`), amounts, addresses, `createdAt`, `updatedAt`, `expiresAt`, hashes.
4. **UI:**
   - **Timer:** Shown only when `internalStatus` is `NEW` or `AWAITING_DEPOSIT`. Countdown 15 minutes from `createdAt`; after that or when status moves to CONFIRMING+, timer is hidden and no “expired” from timer alone.
   - **Expiration:** `isExpired` = status is EXPIRED, or `expiresAt` in the past, or (while in NEW/AWAITING_DEPOSIT) elapsed ≥ 15 min.
   - **Progress:** `getStepFromInternalStatus(internalStatus)` (0–3): 0 = awaiting deposit, 1 = confirming, 2 = performing exchange, 3 = completed.
   - **Time shown:** Order card shows **created** time (`createdAt` formatted). **Updated** time (e.g. “payment confirmed at”) is **not** displayed on the order page; only `createdAt` is shown in `OrderInfoQRCard`. So “when payment was confirmed” is only reflected implicitly by status/step change, not by a separate “confirmed at” timestamp in the UI.

### 2.3 Status progression (source of truth: DB)

- **Internal statuses** (backend only): NEW, AWAITING_DEPOSIT, CONFIRMING, PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, MANUAL_REVIEW, DONE, FAILED, EXPIRED.
- **User-facing** (from `getUserFacingStatus`): “Waiting for payment”, “Waiting for confirmation”, “Performing exchange”, “Completed”, “Failed”, “Expired”.
- **Provider (NOWPayments)** status is mapped in `lib/status-mapping.ts` (`mapProviderStatusToInternal`), e.g. waiting → AWAITING_DEPOSIT, confirming → CONFIRMING, confirmed → PAYMENT_CONFIRMED, finished/success → DONE, etc.

---

## 3. NOWPayments Webhook Flow

### 3.1 Endpoint and verification

- **URL:** `POST /api/webhook/nowpayments` (`app/api/webhook/nowpayments/route.ts`).
- **Body:** Raw body used for signature; JSON parsed for `payment_id`, `payment_status`, `order_id`, etc.
- **Order lookup:** `getOrderByPaymentId(paymentId)`. If not found, responds **200** with “Order not found” (so NOWPayments does not retry).
- **Mode:** From order’s `payment_mode` (or default live). **IPN secret:** live → `NOWPAYMENTS_IPN_SECRET_LIVE` (or `NOWPAYMENTS_IPN_SECRET`), sandbox → `NOWPAYMENTS_IPN_SECRET_SANDBOX`. Signature header: `x-nowpayments-sig` or `x-nowpayments-signature` or `signature`; verified with HMAC-SHA512. If secret is set and signature invalid/missing → **401**.
- **Production:** If IPN secret is not set for the resolved mode, responds **500** so misconfiguration is obvious.

### 3.2 Status update and manual payout

- **Mapping:** `mapProviderStatusToInternal(paymentStatus)` → internal status.
- **Manual payout mode** (`getPayoutMode()`): If payout mode is `manual` and provider says finished/success, webhook **does not** set DONE; it sets PAYMENT_CONFIRMED or (if already PROCESSING_BY_PROVIDER) MANUAL_REVIEW. So “payment confirmed” in DB is the stopping point until admin acts.
- **Atomic update:** `processWebhookStatusUpdateAtomic(...)` (RPC `process_webhook_status_update`):
  - Inserts into `webhook_idempotency(payment_id, payment_status, order_id)`. On conflict (same payment_id + payment_status) → returns `already_processed: true` (idempotent).
  - Updates `orders`: `internal_status`, `user_status`, `status` (legacy), `status_source`, `provider_status`, optional `from_address`, `payin_hash`, `payout_hash`, `updated_at`.
  - Inserts into `order_status_history` when status actually changed.
- So: **payment confirmed** in the app = order’s `internal_status` becomes PAYMENT_CONFIRMED (or MANUAL_REVIEW in manual mode when provider says finished) and `updated_at` is set. **Time of “payment confirmed”** in data = that `updated_at`; the UI does not show this timestamp explicitly.

### 3.3 After DB update

- **Ledger:** If status changed and new status is DONE, `recordOrderCompletion(...)` is called (non-blocking).
- **Notifications:** Only if status **changed** and new status is one of **DONE**, **EXPIRED**, **PROCESSING_BY_PROVIDER**:
  - `notifyOrderStatus(order.userId, order.orderId, newStatus.toLowerCase(), request)`.
  - So when status becomes **PAYMENT_CONFIRMED** only (e.g. first “confirmed” from provider), **no email is sent**. User gets an email when status moves to PROCESSING_BY_PROVIDER, DONE, or EXPIRED. So “payment confirmed” alone does **not** trigger an email — only later steps do.

---

## 4. Email System

### 4.1 When emails are sent (order-related)

- **Verification:** Signup queues or sends verification email (template from `getVerificationEmailTemplate`). Can be queued via `enqueueVerificationEmail` or sent with `sendVerificationEmail` (SMTP).
- **Order status:** Only from `notifyOrderStatus`:
  - **Webhook:** Only for status in `['DONE', 'EXPIRED', 'PROCESSING_BY_PROVIDER']` (see above). So **PAYMENT_CONFIRMED does not trigger email**.
  - **Admin:** When admin does `mark_completed` or `mark_failed`, `notifyOrderStatus(currentOrder.user_id, orderId, newStatus)` is called. So user gets “Completed” or “Failed” email when admin marks it.

### 4.2 Notification pipeline

- `notifyOrderStatus(userId, orderId, status, request)`:
  - Idempotency key: `order:{orderId}:status:{normalizedStatus}`. If already sent for this order+status, returns without sending.
  - Calls `sendNotification(userId, { type: 'order_status', title: \`Order ${orderId} - ${status}\`, message, link })`.
- `sendNotification`:
  - Loads user with `getUserWithPreferences(userId)`. If **userId is null** (anonymous order), user is null → returns false; **no email** and no error.
  - Checks user’s `notificationsEnabled` and `emailVerified`; for `order_status`, also checks `getEmailSetting('order_notifications_enabled', 'true')`.
  - For order_status: builds subject “Order {orderId} - Status Update”, uses `getOrderStatusEmailTemplate(orderId, status, orderLink)` for body. **Enqueues** email via `enqueueEmail({ to, subject, html, text })` — does **not** send SMTP immediately.
- **Queue:** Rows go into `email_queue` (to_email, subject, html, text, status pending, scheduled_at). **Cron** `GET /api/cron/process-email-queue` (Vercel cron every 5 min) picks pending rows, sends via `sendEmailViaSMTP` (category GENERIC), marks sent or retries with backoff (max 3 attempts). So order emails can be **delayed up to ~5 minutes** after the webhook/admin action.

### 4.3 Format and delivery

- **Subject:** “Order {orderId} - Status Update”.
- **Body:** `getOrderStatusEmailTemplate(orderId, status, orderLink)` maps status (e.g. `done`, `processing_by_provider`) to human text (“Completed”, “Performing exchange”) and uses a fixed HTML/text template. Link is `NEXT_PUBLIC_APP_URL/order/{orderId}` (or env fallback). So format is consistent; “hitting” depends on SMTP and cron. If cron is not called (e.g. wrong CRON_SECRET or cron disabled), **emails stay pending** and never send.

### 4.4 Possible issues

- **PAYMENT_CONFIRMED not triggering email:** By design only DONE/EXPIRED/PROCESSING_BY_PROVIDER trigger. If you want “Payment received” emails, you’d add PAYMENT_CONFIRMED (and optionally CONFIRMING) to the webhook’s `importantStatuses` and possibly adjust idempotency/template.
- **Anonymous orders:** `userId` null → no email. No crash; just no notification.
- **Cron:** If `process-email-queue` is not invoked or fails auth (Bearer CRON_SECRET), queued emails never send. Vercel crons are configured in `vercel.json` (every 5 min for process-email-queue).

---

## 5. Admin Side – Payment Confirmed and How Admin Reacts

### 5.1 Where “payment confirmed” appears

- **Orders list** (`app/admin/orders/page.tsx`):
  - Default view excludes pure “unpaid” (NEW/AWAITING_DEPOSIT) unless “Show unpaid” is on. Included: PAYMENT_CONFIRMED, MANUAL_REVIEW, CONFIRMING, PROCESSING_BY_PROVIDER, DONE, FAILED, EXPIRED.
  - **Review Queue** (`reviewQueue=true`): Only PAYMENT_CONFIRMED and MANUAL_REVIEW, oldest first.
- **Orders table** (`OrdersTable`): Columns include **Internal Status**, **Provider Status**, **User Status**, From→To, Amount, Payment ID, **Created**, and **Manual payout** with a “Confirmed” button for orders in PAYMENT_CONFIRMED / MANUAL_REVIEW / PROCESSING_BY_PROVIDER. So when webhook sets PAYMENT_CONFIRMED, the order shows up with internal status **PAYMENT_CONFIRMED** and optional provider_status (e.g. confirmed/finished). Admin sees “payment confirmed” as the **internal_status** value and the **Created** (and backend `updated_at`) time.

### 5.2 Admin actions when payment is confirmed

- **Mark completed:** In Orders table (or order detail), admin clicks “Confirmed” (manual payout). That calls `POST /api/admin/orders/[id]/actions` with `action: 'mark_completed'`.
  - Allowed from: PAYMENT_CONFIRMED, MANUAL_REVIEW, PROCESSING_BY_PROVIDER, CONFIRMING.
  - Updates order to DONE via `updateOrderStatus(..., 'DONE', ..., { source: 'admin' })`, logs admin action, records ledger, and calls `notifyOrderStatus(currentOrder.user_id, orderId, 'DONE', request)`. So user gets “Completed” email (queued) and order page shows “Completed”.
- **Verify payment:** From Payments page or order actions, “Verify” calls same API with `action: 'verify_payment'`. Fetches status from NOWPayments, compares with DB internal status; **read-only**, no DB change.
- **Resync:** `action: 'resync'` fetches status from NOWPayments and updates order (with same manual payout rule: in manual mode, DONE from provider may be stored as PAYMENT_CONFIRMED/MANUAL_REVIEW).
- **Mark failed / lock / unlock / enter payout hash / approve manual payout:** Other actions; do not change “payment confirmed” display per se.

### 5.3 Payments page

- **List:** Orders that have a `payment_id`; optionally filtered to “Paid only” via `status in PAID_STATUSES` (CONFIRMING, PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, MANUAL_REVIEW, DONE). Legacy `status` is kept in sync with `internal_status` by the webhook RPC, so filter is correct.
- **Display:** Payment ID, order ID, status (internal_status/status), user_status, provider_status, amounts, created_at, updated_at. So “payment confirmed” shows as one of the statuses in the table; no separate “confirmed at” column.

---

## 6. Live vs Sandbox

- **Payment creation:** Mode from `getPaymentMode()`. Sandbox uses `getNowPaymentsConfig()` → sandbox API key and `api-sandbox.nowpayments.io`; `case` from `getSandboxCase()`.
- **Webhook:** Order is found by `payment_id`; `order.payment_mode` decides which IPN secret to use (live vs sandbox). So live payments must use live IPN secret, sandbox payments sandbox IPN secret.
- **Sandbox without webhook (e.g. localhost):** When order is fetched on GET order, `maybeApplySandboxSimulation(order)` applies the sandbox outcome after 8 seconds so the order page can show success/failed/expired without NOWPayments being able to reach the webhook.

---

## 7. Summary of Potential Issues and Fixes

| Item | Status | Notes |
|------|--------|------|
| **Payment confirmed but time** | Partial | “Payment confirmed” time = `updated_at` when webhook updates to PAYMENT_CONFIRMED. This is **not** shown on the order page; only **created** time is shown. Consider showing “Last updated” or “Confirmed at” if you want it visible. |
| **Mail when payment hits** | By design | Email is **not** sent when status becomes PAYMENT_CONFIRMED only. Email is sent when status is DONE, EXPIRED, or PROCESSING_BY_PROVIDER. Add PAYMENT_CONFIRMED to webhook `importantStatuses` (and template) if you want “Payment received” emails. |
| **Mail sending but not “hitting”** | Depends | Emails are **queued**; cron every 5 min sends them. If cron is not running or auth fails, emails stay pending. Check Vercel cron and CRON_SECRET. |
| **Mail “hit” in different format** | OK | Subject and body come from `getOrderStatusEmailTemplate`; status is normalized (e.g. “done” → “Completed”). Consistent. |
| **Admin: payment confirmed** | OK | Admin sees PAYMENT_CONFIRMED (and related) in Orders and Payments; Review Queue shows PAYMENT_CONFIRMED/MANUAL_REVIEW. |
| **Admin reaction** | OK | “Confirmed” button calls mark_completed → DONE, ledger, and notifyOrderStatus for “Completed” email. |
| **Anonymous order email** | OK | userId null → no email, no crash. Could add early `if (!userId) return true` in `notifyOrderStatus` for clarity. |
| **Payments filter** | OK | Uses `status`; RPC keeps it in sync with `internal_status`. |

---

## 8. Flow Diagrams (Concise)

**User:** Home → ExchangeWidget → POST /api/payment → redirect /order/[id] → poll GET /api/order/[id] → status/step/timer from DB. Sandbox: simulation can update order after 8s without webhook.

**Webhook:** NOWPayments → POST /api/webhook/nowpayments → verify sig (by order payment_mode) → get order by payment_id → map status → manual mode rule → processWebhookStatusUpdateAtomic → if DONE/EXPIRED/PROCESSING_BY_PROVIDER and changed → notifyOrderStatus → enqueue email → cron sends from queue.

**Admin:** Orders (or Review Queue) → see PAYMENT_CONFIRMED → “Confirmed” → mark_completed → DONE + ledger + notifyOrderStatus(“done”) → user gets “Completed” email when cron runs.

This matches the current codebase behavior and should be used to verify or adjust product expectations (e.g. when to send emails and what time to show for “payment confirmed”).
