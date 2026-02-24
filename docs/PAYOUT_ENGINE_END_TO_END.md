# Payout Engine — End-to-End Flow (Detailed)

This document answers: how payouts work from funds received to completed, how the Manual vs Automatic toggle affects behavior, and whether real blockchain transfers occur in each mode.

---

## 1. End-to-End Flow: Funds Received → Payout Completed

### 1.1 High-level sequence

```
User pays deposit
    → NOWPayments detects payment (blockchain)
    → NOWPayments sends IPN webhook to our backend (or we poll/cron)
    → We map provider status → internal status (with payout-mode override)
    → We persist status via processWebhookStatusUpdateAtomic
    → If DONE: recordOrderCompletion + notifyOrderStatus (email, etc.)
```

**Real blockchain transfers:**

- **Automatic mode:** NOWPayments performs the **real** send to the user’s `payout_address` (we gave it at payment creation). We do **not** run any “swap worker”; we only update status when the provider reports `finished`/`success`.
- **Manual mode:** We do **not** send any payout ourselves. We **omit** `payout_address`/`payout_currency` at creation, so funds stay in NOWPayments merchant balance. An admin sends the user funds **outside** our app (their own wallet/exchange), then uses **Mark completed** (or we auto-complete after 15 minutes — see below).

### 1.2 Detection of incoming funds (three paths)

| Path | Trigger | File(s) | Throttle / cadence |
|------|--------|--------|---------------------|
| **Webhook** | NOWPayments POST when status changes | `app/api/webhook/nowpayments/route.ts` | Per event |
| **Order GET (polling)** | User/frontend calls GET order | `app/api/order/[id]/route.ts` | Once per **15 seconds** per order (`POLL_SYNC_THROTTLE_MS`) |
| **Reconciliation cron** | External cron (e.g. every 5 min) | `app/api/cron/reconcile-orders/route.ts` → `lib/order-reconciliation.ts` | Orders stale **15+ min** (first pass), **25+ min** (second pass) |

All three paths:

1. Resolve the order (by `payment_id` or `order_id`).
2. Get provider status (webhook from body; polling/cron via `getPaymentStatus(paymentId, mode)` in `lib/nowpayments.ts`).
3. Map provider → internal: `mapProviderStatusToInternal(providerStatus)` in `lib/status-mapping.ts`.
4. **Override for manual:** if `order.payoutMode === 'manual'` and mapped status is `DONE`, use `PAYMENT_CONFIRMED` instead (so we never auto-set DONE from provider in manual mode).
5. Call `processWebhookStatusUpdateAtomic(...)` in `lib/db-orders.ts` (idempotent RPC/transaction: idempotency key + order update + status history).
6. If status changed and new status is in `NOTIFICATION_STATUSES`, call `notifyOrderStatus(...)`. If new status is `DONE`, call `recordOrderCompletion(...)`.

So: **no 5–17 minute “delay” is implemented in our code.** The time the user sees (e.g. 5–20 mins) is:

- Blockchain confirmations (e.g. 1–3 blocks).
- NOWPayments’ own processing (conversion, sending).
- Our **poll throttle** (15 s) and **cron** (e.g. 15 / 25 min staleness) only affect how quickly we *learn* the new status, not a fixed 5–17 min timer.

The only explicit “delay then complete” is **sandbox simulation** (`lib/sandbox-simulation.ts`): 7–20 minute delay before simulating DONE for sandbox orders.

---

## 2. Manual vs Automatic Toggle: Backend vs UI

### 2.1 Does the toggle change backend behavior?

**Yes.** It is not only UI-level.

- **Storage:** `exchange_settings` table, row with `key = 'payout_mode'`, `value = { "mode": "manual" | "automatic" }`.
- **Read:** `lib/payout-mode.ts` — `getPayoutMode()`, `isAutomaticPayoutEnabled()`.
- **Write:** Admin Settings calls `POST /api/admin/settings/payout-mode` with `{ "mode": "manual" | "automatic" }` → `app/api/admin/settings/payout-mode/route.ts` → `setPayoutMode(mode, adminId)` in `lib/payout-mode.ts`.

### 2.2 Where the toggle is used in the backend

| Location | What changes when switching to Automatic vs Manual |
|----------|----------------------------------------------------|
| **Payment creation** | `app/api/payment/route.ts` (lines 104–117): reads `getPayoutMode()`. **Automatic:** sets `payout_address` and `payout_currency` in the request to NOWPayments. **Manual:** omits both → funds stay in NOWPayments balance. |
| **Order row** | `orders.payout_mode` is set at creation (`lib/db-orders.ts`, `createOrderWithHistoryTransaction`) from the same `payoutMode` so every status path can see it. |
| **Webhook** | `app/api/webhook/nowpayments/route.ts` (lines 291–294): if `order.payoutMode === 'manual'` and mapped status is `DONE`, we set internal status to `PAYMENT_CONFIRMED` instead of DONE. |
| **Order GET sync** | `app/api/order/[id]/route.ts` (lines 106–108): same override (manual + DONE → PAYMENT_CONFIRMED). |
| **Reconciliation (first pass)** | `lib/order-reconciliation.ts` (lines 178–180): same override. |
| **Reconciliation (second pass)** | `lib/order-reconciliation.ts` (line 304): for paid orders when provider is `finished`/`success`, `mappedStatus = order.payoutMode === 'manual' ? 'PAYMENT_CONFIRMED' : 'DONE'`. |
| **Admin resync** | `app/api/admin/orders/[id]/actions/route.ts` (lines 219–221): same manual/DONE → PAYMENT_CONFIRMED override. |
| **Force-provider-sync** | `app/api/admin/orders/[id]/force-provider-sync/route.ts` (lines 72–74): same. |
| **Webhook replay** | `app/api/admin/webhooks/[id]/replay/route.ts` (lines 59–61): same. |
| **Payment verify** | `app/api/admin/payments/[id]/verify/route.ts` (lines 48–50): same (uses `order.payout_mode`). |
| **Sandbox simulation** | `lib/sandbox-simulation.ts`: same manual override. |

So the **only** logic change when switching Manual ↔ Automatic is:

- **At creation:** whether we send `payout_address`/`payout_currency` to NOWPayments (automatic = yes, manual = no).
- **At detection:** when provider says `finished`/`success`, whether we set internal status to **DONE** (automatic) or **PAYMENT_CONFIRMED** (manual).

### 2.3 Where the toggle is handled in the UI

- **Admin Settings page:** `app/admin/settings/page.tsx` — two buttons “Manual Payouts” / “Automatic Payouts” calling `handleChangePayoutMode('manual')` / `handleChangePayoutMode('automatic')`, which call `POST /api/admin/settings/payout-mode`.
- **Admin order detail:** `components/admin/OrderDetailPanel.tsx` — fetches `GET /api/admin/settings/payout-mode` to show current mode (e.g. to show/hide manual actions).

---

## 3. Automatic Mode: Does the System Automatically Send Funds?

**Yes.** But the sender is **NOWPayments**, not our backend.

- At payment creation we pass `payout_address` and `payout_currency` to NOWPayments.
- NOWPayments detects the incoming deposit, does its conversion (if any), and **performs the on-chain payout** to that address.
- We do **not** run an internal “auto-transfer” job. We only:
  - **Listen:** webhook (event-driven) and/or order GET (polling) and/or reconcile cron (scheduled).
  - **Update status:** when provider reports `finished`/`success`, we set status to DONE and run `recordOrderCompletion` + `notifyOrderStatus`.

So:

- **Auto-transfer is triggered by:** NOWPayments (they send funds when the payment is complete). Our “trigger” is just **receiving the webhook** (or learning via poll/cron) that status is `finished`/`success`.
- **No 5–17 minute delay in code:** we don’t wait 5–17 minutes then send; we only react to provider status. The 5–20 min the user sees is blockchain + provider processing time.

---

## 4. Manual Mode: Swap Logic and Supported Pairs

### 4.1 Does the backend do a “swap” between token pairs?

**No.** We never perform a swap or an on-chain send in our backend.

- **Manual:** We do **not** send any payout. We omit `payout_address`/`payout_currency`, so the user’s deposit is credited to the **merchant balance** on NOWPayments. An admin is expected to send the user the correct asset (e.g. from another wallet or exchange) and then **Mark completed** in the admin panel (or the order is auto-completed after 15 minutes — see below).
- **Automatic:** NOWPayments does the conversion and send; we only update status when they report `finished`/`success`.

So in both modes there are **no** token-pair “swap” functions in our codebase; conversion (if any) is done by NOWPayments in automatic mode, and in manual mode the admin handles sending the right asset.

### 4.2 Supported pairs and unsupported pairs

- **Supported pairs** are whatever NOWPayments supports (e.g. BTC, ETH, USDT, LTC, etc.). We validate min/max via `GET /api/exchange/limits` (NOWPayments API). The exchange widget blocks or warns on unsupported pairs using that API.
- **Manual mode** does **not** add or remove pair validation. Same limits/supported pairs as automatic; the only difference is whether we give NOWPayments a payout address.
- **If a user somehow creates an order for an unsupported pair:** payment creation would typically fail at NOWPayments (e.g. “Currency X is not convertable to Y”). If an order existed and the provider later reports `failed`/`expired`, we map that to FAILED/EXPIRED. We don’t have special “unsupported pair” handling beyond limits and payment creation errors.

---

## 5. Manual Mode: How Does the Order Reach “Completed” (DONE)?

Two ways:

1. **Admin marks it completed**  
   - Admin sends the user funds externally, then in Admin → Order detail uses action **Mark completed** (`mark_completed`).  
   - **File:** `app/api/admin/orders/[id]/actions/route.ts` (case `mark_completed`).  
   - Updates order to `DONE`, calls `recordOrderCompletion` and `notifyOrderStatus`. Optional: admin can use **Enter payout hash** (`enter_payout_hash`) to store the tx hash before or after marking completed.

2. **Auto-complete after 15 minutes**  
   - Cron runs **manual payout auto-complete** for orders in `PAYMENT_CONFIRMED`, `PROCESSING_BY_PROVIDER`, or `MANUAL_REVIEW` that are **older than 15 minutes** and have `payout_mode = 'manual'`.  
   - **Files:**  
     - `app/api/cron/reconcile-orders/route.ts` calls `runManualPayoutAutoComplete({ limit: 50 })`.  
     - Eligibility is by `manual_auto_complete_at <= now()` (per-order random 3–15 min from first PAYMENT_CONFIRMED), not a fixed 15 min.  
     - `lib/order-reconciliation.ts`: `runManualPayoutAutoComplete`, which uses `findStaleManualOrdersForAutoComplete` in `lib/db-orders.ts`.  
   - For each such order it calls `updateOrderStatus(order.orderId, 'DONE', ...)` with `source: 'system'` and `skipTransitionCheck: true`, then `recordOrderCompletion` and `notifyOrderStatus`.  
   - So: **manual orders can become DONE without admin clicking “Mark completed”** if they sit in those statuses for 15+ minutes. This is a **status-only** transition; we do **not** send any blockchain transaction in this step.

---

## 6. Real Blockchain Transfers vs Simulated Completion

| Mode | Who sends funds to the user? | Do we perform an on-chain send? |
|------|------------------------------|----------------------------------|
| **Automatic** | NOWPayments (they send to `payout_address` we gave at creation). | No. NOWPayments does the real transfer. We only update status when they report `finished`/`success`. |
| **Manual** | Admin (outside our app). We never send. | No. We never send. We only update status to DONE when admin clicks “Mark completed” or when the 15-min auto-complete runs (status-only; no tx). |

So:

- **Real blockchain transfers:** In **automatic** mode, YES — performed by NOWPayments to the user’s payout address. In **manual** mode, the only real transfer to the user is the one the admin does externally; we don’t do one.
- **Simulated completion:** The only “simulated” part is the **manual auto-complete**: we move the order to DONE after 15 minutes without verifying that an admin actually sent funds. So in manual mode, “Completed” can mean either “admin marked it and (optionally) entered a payout hash” or “system auto-completed after 15 min” (no on-chain action by us).

---

## 7. Key Files and Functions (Quick Reference)

| Purpose | File | Function / area |
|--------|------|------------------|
| Payout mode read/write | `lib/payout-mode.ts` | `getPayoutMode()`, `setPayoutMode()`, `isAutomaticPayoutEnabled()` |
| Payment creation (conditional payout) | `app/api/payment/route.ts` | Exchange branch: `getPayoutMode()`, set `payout_address`/`payout_currency` only if automatic |
| NOWPayments create payment | `lib/nowpayments.ts` | `createPayment()` — adds `payout_address`/`payout_currency` to payload only if present |
| Provider → internal status | `lib/status-mapping.ts` | `mapProviderStatusToInternal()` (no payout mode; override at call sites) |
| Webhook handler | `app/api/webhook/nowpayments/route.ts` | POST: manual + DONE → PAYMENT_CONFIRMED; then `processWebhookStatusUpdateAtomic` |
| Order GET sync | `app/api/order/[id]/route.ts` | Throttled poll (15 s), same manual/DONE override, then `processWebhookStatusUpdateAtomic` |
| Reconciliation | `lib/order-reconciliation.ts` | `runOrderReconciliation()` (first + second pass), manual override; `runManualPayoutAutoComplete()` |
| Manual auto-complete query | `lib/db-orders.ts` | `findStaleManualOrdersForAutoComplete()` — `payout_mode = 'manual'`, status in PAYMENT_CONFIRMED/PROCESSING_BY_PROVIDER/MANUAL_REVIEW, `manual_auto_complete_at <= now()` (per-order random 3–15 min) |
| Atomic status update | `lib/db-orders.ts` | `processWebhookStatusUpdateAtomic()` — idempotency + order update + history |
| Admin: Mark completed | `app/api/admin/orders/[id]/actions/route.ts` | Case `mark_completed`: `updateOrderStatus(..., 'DONE')`, `recordOrderCompletion`, `notifyOrderStatus` |
| Admin: Payout mode API | `app/api/admin/settings/payout-mode/route.ts` | GET returns mode; POST calls `setPayoutMode()` |
| Cron entrypoint | `app/api/cron/reconcile-orders/route.ts` | Calls `runOrderReconciliation` and `runManualPayoutAutoComplete` |

---

## 8. Flow Diagrams (ASCII)

### 8.1 Automatic mode (funds received → completed)

```
User sends crypto to pay_address
    → NOWPayments detects deposit
    → NOWPayments converts (if needed) and sends to payout_address (real on-chain send)
    → NOWPayments sets status to confirming → sending → finished/success
    → NOWPayments sends IPN to POST /api/webhook/nowpayments (or we learn via GET order / cron)
    → We map finished/success → DONE (no override; order.payoutMode is automatic)
    → processWebhookStatusUpdateAtomic(internalStatus: DONE)
    → recordOrderCompletion + notifyOrderStatus
    → User sees "Completed"
```

### 8.2 Manual mode (funds received → completed)

```
User sends crypto to pay_address
    → NOWPayments detects deposit; funds stay in merchant balance (no payout_address was sent)
    → NOWPayments may still report confirming → confirmed / finished
    → Webhook or poll or cron: we map finished/success → PAYMENT_CONFIRMED (override because payoutMode === 'manual')
    → processWebhookStatusUpdateAtomic(internalStatus: PAYMENT_CONFIRMED)
    → Order stays in "Swap in Progress"

Then either:
  A) Admin sends user funds externally → Admin clicks "Mark completed"
        → POST .../actions { action: 'mark_completed' } → updateOrderStatus(..., 'DONE') → recordOrderCompletion + notifyOrderStatus
  B) Scheduled time (manual_auto_complete_at) is reached (random 3–15 min from first PAYMENT_CONFIRMED, set once in process_webhook_status_update)
        → Cron runManualPayoutAutoComplete → findStaleManualOrdersForAutoComplete (manual_auto_complete_at <= now()) → updateOrderStatus(..., 'DONE') (no on-chain send by us)
```

---

## 9. Summary Table

| Question | Answer |
|----------|--------|
| Does the toggle change backend behavior? | Yes. It controls whether we send `payout_address`/`payout_currency` at creation and whether we map provider `finished`/`success` to DONE or PAYMENT_CONFIRMED. |
| Where is the toggle handled? | UI: `app/admin/settings/page.tsx`. API: `app/api/admin/settings/payout-mode/route.ts`. Logic: `lib/payout-mode.ts`. |
| In Automatic, does the system auto-send to the user? | Yes — by NOWPayments, using the payout address we sent at creation. We don’t send; we only update status when they report finished/success. |
| How is auto-transfer “triggered”? | Event-driven: NOWPayments sends IPN webhook. We also sync via order GET (throttled 15 s) and reconcile cron (15/25 min staleness). |
| Is there a 5–17 minute delay in our code? | No fixed 5–17 min. User-visible delay is blockchain + NOWPayments. We have 15 s poll throttle and 15/25 min cron staleness; sandbox has 7–20 min simulated delay. |
| In Manual, do we do swap logic? | No. We never perform swaps or on-chain sends. Admin (or 15-min auto-complete) only updates status to DONE. |
| Real blockchain transfers? | Automatic: YES (by NOWPayments to user). Manual: only what the admin sends externally; our “Mark completed” / auto-complete are status-only. |
| Unsupported pair in manual? | Same as automatic: creation can fail (limits/API). No extra validation in manual; no special “unsupported pair” path beyond that. |
