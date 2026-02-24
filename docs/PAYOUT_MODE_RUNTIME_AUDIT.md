# Deep Audit — Manual vs Automatic Payout Runtime Flow

This document verifies the **actual runtime behavior** from the current codebase (no assumptions).

---

## 1. Invoice / Payment Creation

### 1.1 User flow (select send crypto → receive crypto → destination → Continue)

**Frontend:** User selects send asset, receive asset, amount, and **destination wallet** in the exchange widget (`components/ExchangeWidget.tsx` or `ExchangeWidgetNew.tsx`), then clicks Continue. The widget builds a body with `type: "exchange"`, `send_asset`, `receive_asset`, `send_amount`, `expected_receive`, **`destination`** (payout address), `order_id`, `price_amount`, etc., and calls **`POST /api/payment`**.

**Backend:** `app/api/payment/route.ts` (exchange branch, ~lines 19–212).

### 1.2 Is payout_mode read at creation time?

**Yes.** Code (lines 101–103):

```ts
const currentPaymentMode = await getPaymentMode();
const payoutMode = await getPayoutMode();
```

- **`getPayoutMode()`** — `lib/payout-mode.ts`: reads `exchange_settings` where `key = 'payout_mode'`, returns `'manual'` or `'automatic'` (default `'manual'` if missing).

### 1.3 Are payout_address and payout_currency conditional?

**Yes.** Lines 105–117:

```ts
const paymentParams: any = {
  price_amount: parseFloat(priceAmount),
  price_currency: (body.price_currency || 'usd').toLowerCase(),
  pay_currency: body.send_asset.toLowerCase(),
  order_id: body.order_id,
  order_description: body.order_description || `Exchange ...`,
};
if (payoutMode === 'automatic') {
  paymentParams.payout_address = body.destination;
  paymentParams.payout_currency = body.receive_asset.toLowerCase();
}
```

- **Automatic:** `payout_address` and `payout_currency` are set from `body.destination` and `body.receive_asset`.
- **Manual:** They are **not** set; `paymentParams` has no payout fields.

Then (lines 127–128) `paymentParams.ipn_callback_url = ${publicBaseUrl}/api/webhook/nowpayments` is set for both. Sandbox may add `paymentParams.case`. **`createPayment(paymentParams)`** is called (`lib/nowpayments.ts`).

### 1.4 Exact request sent to NOWPayments (`POST /v1/payment`)

**`lib/nowpayments.ts`** `createPayment()` builds the JSON body (lines 130–145):

- Always: `price_amount`, `price_currency`, `pay_currency`.
- If present: `order_id`, `order_description`, `ipn_callback_url`, **`payout_address`**, **`payout_currency`** (only added when `params.payout_address` / `params.payout_currency` are truthy).
- Sandbox only: `case`.

So the **exact payload**:

| Mode        | Payload to NOWPayments |
|------------|-------------------------|
| **Automatic** | `price_amount`, `price_currency`, `pay_currency`, `order_id`, `order_description`, `ipn_callback_url`, **`payout_address`**, **`payout_currency`** (+ optional sandbox `case`). |
| **Manual**    | Same **except no** `payout_address` or `payout_currency`. Funds stay in NOWPayments balance. |

Order is then saved with **`payoutMode`** in `orderData` (line 174) → `createOrderWithHistoryTransaction` → DB column **`orders.payout_mode`** (migration 047/048, `lib/db-orders.ts`).

### 1.5 Summary: how invoice generation differs

- **Automatic:** NOWPayments receives a payout destination; they will send the converted funds to that address when the payment is finished.
- **Manual:** NOWPayments receives no payout destination; they credit the deposit to the merchant balance; no automatic send to user. Admin pays the user manually and marks the order completed in the app.

---

## 2. User Status Progression (UI Timeline)

### 2.1 Backend-driven status flow

The UI does **not** compute status locally. It uses:

- **`GET /api/order/[id]`** → returns `order.internalStatus`, `order.currentStep` (from **`getCurrentStep(order.internalStatus)`**), `order.userStatus` (from DB).
- **`lib/status-mapping.ts`**: **`getUserFacingStatus(internalStatus)`** and **`getCurrentStep(internalStatus)`** map internal → user-facing labels and step index.

**UI steps (expected vs code):**

| Step | User-facing label        | Internal statuses                          | Step index |
|------|---------------------------|--------------------------------------------|------------|
| 0    | Awaiting deposit          | NEW, AWAITING_DEPOSIT                      | 0          |
| 1    | Confirming on Chain       | CONFIRMING                                 | 1          |
| 2    | Swap in Progress          | PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, MANUAL_REVIEW | 2 |
| 3    | Completed                 | DONE                                       | 3          |

**File:** `lib/status-mapping.ts` — `getUserFacingStatus`, `getCurrentStep`.  
**Order page:** `app/order/[id]/page.tsx` — uses `apiOrder.internalStatus`, `apiOrder.currentStep` (or `getStepFromInternalStatus(apiOrder.internalStatus)`), and stops polling when `internalStatus` is DONE/FAILED/EXPIRED.

### 2.2 Provider status → internal status mapping

**`lib/status-mapping.ts`** — **`mapProviderStatusToInternal(providerStatus)`**:

| Provider status   | Internal status      |
|-------------------|----------------------|
| waiting           | AWAITING_DEPOSIT     |
| confirming        | CONFIRMING           |
| confirmed         | PAYMENT_CONFIRMED    |
| sending           | PROCESSING_BY_PROVIDER |
| partially_paid    | PAYMENT_CONFIRMED    |
| finished / success| **DONE**             |
| failed / expired / refunded | FAILED / EXPIRED |

Then **per-order override** (in webhook, order GET sync, reconciliation, force-provider-sync, resync, replay, verify, sandbox):  
**If `order.payoutMode === 'manual'` and mapped status would be DONE → we pass PAYMENT_CONFIRMED instead** (so manual orders never auto-reach DONE from provider).

So in **manual mode**:

- `confirming` → **CONFIRMING** (UI: Confirming on Chain).
- `confirmed` → **PAYMENT_CONFIRMED** (UI: Swap in Progress).
- `finished` / `success` → we **override** to **PAYMENT_CONFIRMED** (still Swap in Progress); **no** automatic move to Completed.

### 2.3 Is there a delayed worker that moves manual orders to COMPLETED?

**No.** There is **no** scheduled job or cron that moves manual orders from PAYMENT_CONFIRMED (or CONFIRMING / PROCESSING_BY_PROVIDER / MANUAL_REVIEW) to DONE after X minutes.

- **Reconciliation cron** (`app/api/cron/reconcile-orders`, `lib/order-reconciliation.ts`):  
  - First pass: stale NEW/AWAITING_DEPOSIT/CONFIRMING → poll provider → apply mapped status (with manual override: DONE → PAYMENT_CONFIRMED).  
  - Second pass: stale PAYMENT_CONFIRMED/MANUAL_REVIEW/PROCESSING_BY_PROVIDER → if provider says `finished`/`success`, we set **PAYMENT_CONFIRMED for manual** and **DONE for automatic** (lines 296–297: `order.payoutMode === 'manual' ? 'PAYMENT_CONFIRMED' : 'DONE'`).  
  So the cron **does not** auto-complete manual orders; it only keeps DB in sync with provider and respects payout_mode.

- **Manual completion:** The **only** way a manual order becomes DONE is when an admin runs **mark_completed** (`app/api/admin/orders/[id]/actions/route.ts`, action `mark_completed`).

**Conclusion:** There is **no** “after 5–15 min worker” that moves manual orders to Completed. Manual orders stay at “Swap in Progress” (PAYMENT_CONFIRMED / PROCESSING_BY_PROVIDER / MANUAL_REVIEW) until an admin marks them completed.

---

## 3. Automatic Payout Mode — Verification

| Check | Verified in code |
|-------|------------------|
| Payout params at creation | **Yes.** `payoutMode === 'automatic'` → `payout_address` and `payout_currency` set in `paymentParams` (`app/api/payment/route.ts` 114–116) and sent by `createPayment()` (`lib/nowpayments.ts` 140–141). |
| NOWPayments performs swap | **Yes.** NOWPayments does the conversion and sends to `payout_address` when they mark payment finished (their responsibility; we only create the payment with those params). |
| Provider `finished` → internal DONE | **Yes.** `mapProviderStatusToInternal('finished')` → DONE; for automatic we do **not** override, so webhook/order GET/cron/force-provider-sync all pass DONE to `processWebhookStatusUpdateAtomic` or `updateOrderStatus`. |
| UI shows Completed after `finished` | **Yes.** DB gets `internal_status = DONE`; GET `/api/order/[id]` returns `internalStatus: 'DONE'`, `currentStep: 3`; UI shows Completed and stops polling. |
| No internal swap worker | **Yes.** We do not run any “swap” or “payout” job; NOWPayments handles payout. Reconciliation only syncs status from provider and applies DONE when provider is `finished` (for automatic). |

**Functions responsible (automatic flow):**

- **Creation:** `app/api/payment/route.ts` — `getPayoutMode()`, conditional `payout_address`/`payout_currency`, `createPayment(paymentParams)`, `createOrderWithHistoryTransaction(..., payoutMode)`.
- **Detection / DONE:** `app/api/webhook/nowpayments/route.ts` — `mapProviderStatusToInternal` then (no override for automatic) `processWebhookStatusUpdateAtomic(..., internalStatus: mappedStatus)`; same pattern in `app/api/order/[id]/route.ts`, `lib/order-reconciliation.ts`, `app/api/admin/orders/[id]/force-provider-sync/route.ts`.
- **DB update:** `lib/db-orders.ts` — `processWebhookStatusUpdateAtomic` → RPC `process_webhook_status_update` (`supabase/migrations/044_webhook_guard_final_states.sql`).

---

## 4. Admin Notification (Telegram)

### 4.1 When is the Telegram “Swap Hit” sent?

**File:** `app/api/webhook/nowpayments/route.ts` (lines 374–406).

Sent when **all** of:

- `statusChanged === true` (status actually changed in this webhook run),
- **`newStatus === 'CONFIRMING'`** (first on-chain confirmation),
- **`order.paymentMode !== 'sandbox'`** (live only).

So it fires when the **provider status** first maps to **CONFIRMING** (i.e. when NOWPayments sends `confirming` and we update the order to CONFIRMING).

### 4.2 Which function sends it?

**`sendTelegramNotification(...)`** — `lib/telegram.ts`. It builds the message with **`buildSwapHitMessage`** and sends to Telegram (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID). The webhook handler calls it and catches errors so a Telegram failure does not fail the webhook response.

### 4.3 Do both manual and automatic trigger the same admin notification?

**Yes.** The condition does **not** depend on `payout_mode` or `order.payoutMode`. It only depends on:

- status change to CONFIRMING,
- live order (not sandbox).

So **manual** and **automatic** orders both trigger the same Telegram “Swap Hit” when status becomes CONFIRMING.

### 4.4 What could prevent it?

- Webhook not received (URL wrong, signature fail, order not found).
- `order.paymentMode === 'sandbox'` (sandbox orders never send Telegram).
- Telegram env (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) missing or invalid (error is logged; webhook still returns 200).
- Status not changing (e.g. idempotent retry with same CONFIRMING) — then `statusChanged` is false, so no Telegram.

---

## 5. Email Notification (User)

### 5.1 Does the user get email when order becomes Completed?

**Yes.** When the order becomes **DONE** (Completed), any code path that updates status to DONE and then calls **`notifyOrderStatus(userId, orderId, 'done', request)`** will trigger the email (subject “Order {orderId} - Status Update”, body from **`getOrderStatusEmailTemplate(orderId, status, orderLink)`** in `lib/email-template.ts`).

Paths that can set DONE and then call `notifyOrderStatus`:

- **Webhook** — when provider sends `finished` and we set DONE (automatic only; manual is overridden to PAYMENT_CONFIRMED), then `notifyOrderStatus(..., newStatus.toLowerCase(), request)` (e.g. `'done'`).
- **Order GET sync** — same: when we apply DONE we call `notifyOrderStatus` for that status.
- **Reconciliation** — when we set DONE we call `notifyOrderStatus(order.userId, order.orderId, mappedStatus.toLowerCase())`.
- **Admin mark_completed** — after `updateOrderStatus(..., 'DONE')`, we call **`notifyOrderStatus(currentOrder.user_id, params.id, updatedOrder.internalStatus, request)`** with `updatedOrder.internalStatus === 'DONE'` (so status string is `'DONE'`; in `notifyOrderStatus` it’s normalized to uppercase then used as idempotency key and in the email title as “Order X - DONE” / template uses status for body).

### 5.2 Which function triggers the email?

**`notifyOrderStatus(userId, orderId, status, request)`** in `lib/notifications.ts`. It:

- Skips if `userId` is null (guest orders).
- Uses idempotency key `order:{orderId}:status:{normalizedStatus}` so the same status email is only sent once.
- Calls **`sendNotification(userId, { type: 'order_status', title: \`Order ${orderId} - ${status}\`, message: '...', link })`**.
- **`sendNotification`** uses **`getOrderStatusEmailTemplate(orderId, status, orderLink)`** and **`sendGenericEmail`** for the actual send.

So the **trigger** is always **`notifyOrderStatus`**; the **sender** is **`sendNotification`** → **`sendGenericEmail`** (`lib/email.ts`).

### 5.3 Does manual delayed completion trigger email correctly?

**Yes.** For manual orders, DONE is set **only** when admin runs **mark_completed**. That handler (actions route) calls:

```ts
notifyOrderStatus(currentOrder.user_id, params.id, updatedOrder.internalStatus, request)
```

with `updatedOrder.internalStatus === 'DONE'`. So the user receives the same “order status update” email for Completed when the admin marks the order completed. There is no separate “manual completion” path that skips email.

---

## 6. Broken or Missing Logic Check

### 6.1 Webhook updates and UI

- **Webhook** updates DB via **`processWebhookStatusUpdateAtomic`** (RPC).  
- **UI** polls **GET /api/order/[id]** every 3–6 s and uses **`order.internalStatus`** and **`order.currentStep`** from the response.  
- So when the webhook updates `internal_status`, the next GET returns the new status and the UI updates. **No bug identified**: webhook updates do drive UI status.

### 6.2 Polling and provider status mapping

- **Order GET** (`app/api/order/[id]/route.ts`): for NEW/AWAITING_DEPOSIT/CONFIRMING (and throttle), we call **`getPaymentStatus`** → **`mapProviderStatusToInternal(providerStatus)`** → **manual override** (if manual and DONE → PAYMENT_CONFIRMED) → **`processWebhookStatusUpdateAtomic`**.  
- **Reconciliation:** same mapping + same manual override in both passes.  
So polling **does** map provider statuses correctly and **does** respect `payout_mode`. **No bug identified** in mapping or override.

### 6.3 Missing worker for manual “delayed” completion

- **Gap (by design):** There is **no** automated delay (e.g. 5–15 min) that moves manual orders from “Swap in Progress” to Completed. Manual orders only reach Completed when an admin clicks **mark_completed**.  
- So the **expected** behavior “after X minutes worker moves manual to COMPLETED” is **not** implemented. The current design is: manual = admin pays user externally, then admin marks completed. If you want a time-based auto-complete for manual, that would require a new job (e.g. “after 15 min in PAYMENT_CONFIRMED and payout_mode=manual, set DONE”) — not present today.

### 6.4 Telegram admin notification

- Fires on **CONFIRMING** for **live** orders only; **both** manual and automatic.  
- Does **not** fire in sandbox; does **not** fire if status didn’t change or webhook failed. No inconsistency found with payout_mode.

### 6.5 payout_mode in detection paths

- **Checked:** webhook, order GET sync, reconciliation (first and second pass), force-provider-sync, admin resync, webhook replay, payment verify, sandbox simulation all use **order.payoutMode** (or raw `payout_mode`) and override DONE → PAYMENT_CONFIRMED for manual. **payout_mode is respected** in all detection paths that can set DONE.

### 6.6 Diagrams

**Manual flow (actual):**

```
Awaiting (NEW/AWAITING_DEPOSIT)
    ↓  user pays; provider: waiting → confirming
Confirming (CONFIRMING)          ← Telegram "Swap Hit" (live only)
    ↓  provider: confirming → confirmed / finished
Swap in Progress (PAYMENT_CONFIRMED)   ← we override finished → PAYMENT_CONFIRMED
    ↓  NO automatic transition; cron keeps status PAYMENT_CONFIRMED if provider is finished
    ↓  admin pays user externally
    ↓  admin clicks "Mark completed"
Completed (DONE)                ← notifyOrderStatus → email
```

**Automatic flow (actual):**

```
Awaiting (NEW/AWAITING_DEPOSIT)
    ↓  user pays; provider: waiting → confirming
Confirming (CONFIRMING)          ← Telegram "Swap Hit" (live only)
    ↓  provider: confirming → sending → finished
Sending / Swap (PROCESSING_BY_PROVIDER then DONE)  ← NOWPayments sends to payout_address
Completed (DONE)                ← webhook/order GET/cron set DONE; notifyOrderStatus → email
```

(No internal “swap worker”; NOWPayments performs the send.)

### 6.7 Inconsistencies summary

| Item | Status |
|------|--------|
| Webhook → UI status | OK; GET /api/order/[id] returns DB status. |
| Polling mapping + manual override | OK; all paths apply override. |
| Manual auto-complete after X min | **Not implemented**; manual → Completed only via admin mark_completed. |
| Telegram for manual vs automatic | OK; same CONFIRMING trigger for both. |
| Email on Completed (auto vs manual) | OK; both trigger notifyOrderStatus when status becomes DONE. |
| payout_mode in all detection paths | OK; overrides applied everywhere that can set DONE. |

---

## 7. File / Function Reference

| Purpose | File | Function / location |
|--------|------|----------------------|
| Payout mode at creation | `app/api/payment/route.ts` | `getPayoutMode()`, conditional `payout_address`/`payout_currency` (lines 101–117) |
| NOWPayments payload | `lib/nowpayments.ts` | `createPayment()` — builds payload, adds payout only if provided (140–141) |
| Provider → internal mapping | `lib/status-mapping.ts` | `mapProviderStatusToInternal()` |
| Manual override (DONE → PAYMENT_CONFIRMED) | Webhook, order GET, reconciliation, force-provider-sync, resync, replay, verify, sandbox | After `mapProviderStatusToInternal`, if manual and DONE then use PAYMENT_CONFIRMED |
| UI step from internal status | `lib/status-mapping.ts` | `getCurrentStep()`, `getUserFacingStatus()` |
| Order API response | `app/api/order/[id]/route.ts` | Returns `internalStatus`, `currentStep`, `userStatus` |
| Telegram “Swap Hit” | `app/api/webhook/nowpayments/route.ts` | After atomic update; `sendTelegramNotification()` (`lib/telegram.ts`) when newStatus === CONFIRMING and not sandbox |
| Email on status change | `lib/notifications.ts` | `notifyOrderStatus()` → `sendNotification()` → `getOrderStatusEmailTemplate()` + `sendGenericEmail()` |
| Manual completion | `app/api/admin/orders/[id]/actions/route.ts` | Action `mark_completed` → `updateOrderStatus(..., 'DONE')` → `notifyOrderStatus(..., 'DONE')` |
| Reconciliation (no auto-DONE for manual) | `lib/order-reconciliation.ts` | Second pass: `order.payoutMode === 'manual' ? 'PAYMENT_CONFIRMED' : 'DONE'` |

This audit reflects the **actual runtime behavior** in the codebase as of the implementation described above.
