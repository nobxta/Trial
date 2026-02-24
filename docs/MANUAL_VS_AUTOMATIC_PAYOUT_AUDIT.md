# Manual vs Automatic Payout — Full Codebase Audit

This document describes the **actual runtime behavior** of payout mode in the MintMove system based on code analysis, not documentation assumptions.

---

## 1. Payment Creation Logic

### 1.1 Where payout mode is stored and read

| Location | Purpose |
|----------|---------|
| **`exchange_settings`** table | Row with `key = 'payout_mode'`, `value = { "mode": "manual" \| "automatic" }`. |
| **`lib/payout-mode.ts`** | `getPayoutMode(): Promise<'manual' \| 'automatic'>` — reads from `exchange_settings`; default `'manual'` if missing. `setPayoutMode(mode, adminId)` — upserts the setting. `isAutomaticPayoutEnabled(): Promise<boolean>` — returns `getPayoutMode() === 'automatic'`. |
| **Admin UI** | `app/admin/settings/page.tsx` — toggle Manual / Automatic; calls `GET/POST /api/admin/settings/payout-mode` which uses `getPayoutMode` / `setPayoutMode`. |

### 1.2 Payment creation route — actual behavior

**File:** `app/api/payment/route.ts`

- **Exchange branch (lines 19–212):**
  - Calls **`getPaymentMode()`** (live/sandbox) only. **Does not call `getPayoutMode()` or `isAutomaticPayoutEnabled()`**.
  - **Always** sets:
    - `payout_address: body.destination` (line 109)
    - `payout_currency: body.receive_asset.toLowerCase()` (line 110)
  - Passes `paymentParams` to **`createPayment(paymentParams)`** (`lib/nowpayments.ts`).
- **Payment (non-exchange) branch (lines 214–319):**
  - Does not use `payout_address` / `payout_currency` at all (simple “pay us” flow).

**Conclusion:** Payment creation **never reads payout mode**. Every exchange payment is created **with** `payout_address` and `payout_currency`, i.e. as an automatic-style payment from NOWPayments’ perspective.

### 1.3 NOWPayments API behavior (from our usage)

**File:** `lib/nowpayments.ts` — `createPayment()`

- `PaymentRequest` has optional `payout_address?` and `payout_currency?`.
- Payload is built as: `if (params.payout_address) payload.payout_address = ...`; same for `payout_currency`. So **omitting them is supported** by our client; NOWPayments will receive a payment **without** payout destination → funds typically remain in merchant balance (manual payout behavior at provider level).

### 1.4 Intended vs current behavior (by mode)

| Mode | Intended | Current (code) |
|------|----------|----------------|
| **Automatic** | Create payment **with** `payout_address` + `payout_currency`. NOWPayments sends funds to user when `finished`. When provider reports `finished`, set order to **DONE**. | ✅ Creation: we always send payout params. ✅ Detection: we always map `finished` → DONE (no payout-mode check). So **automatic flow is fully implemented** for creation and status. |
| **Manual** | Create payment **without** payout params so funds stay in NOWPayments balance. When provider reports `confirming` / `finished`, set **CONFIRMING** or **PAYMENT_CONFIRMED** (or **MANUAL_REVIEW**), **not** DONE. DONE only when admin runs **mark_completed**. | ❌ Creation: we **always** send payout params → we never create a “manual” payment at provider. ❌ Detection: we **never** check payout mode; we always map `finished` → DONE. So **manual flow is not implemented** at creation or in webhook/polling/cron. |

### 1.5 At what provider status the order becomes DONE (current code)

- **`mapProviderStatusToInternal()`** (`lib/status-mapping.ts`): `finished` and `success` → **DONE**; no payout-mode parameter; no branch for manual.
- **Webhook** (`app/api/webhook/nowpayments/route.ts`): `mappedStatus = mapProviderStatusToInternal(paymentStatus)` then `processWebhookStatusUpdateAtomic(..., internalStatus: mappedStatus)`. So when provider sends **`finished`**, order becomes **DONE** regardless of payout mode.
- **Order GET sync** and **reconciliation** use the same `mapProviderStatusToInternal` + `processWebhookStatusUpdateAtomic` with no payout-mode check.

So: **DONE is triggered whenever the provider reports `finished` (or `success`)**, in all detection paths. There is **no** logic that prevents DONE in manual mode.

---

## 2. User Flow (Real Runtime Flow)

### 2.1 Automatic payout mode (as implemented)

| Step | What happens | Files / functions |
|------|----------------|-------------------|
| 1. User creates exchange | Frontend POSTs to `/api/payment` with `type: "exchange"`, `destination`, etc. | `components/ExchangeWidget.tsx` / `ExchangeWidgetNew.tsx` |
| 2. Payment created | `app/api/payment/route.ts`: builds `payout_address`, `payout_currency`, calls `createPayment()` → NOWPayments returns deposit address. Order saved with `internal_status: 'NEW'`. | `app/api/payment/route.ts`, `lib/nowpayments.ts`, `lib/db-orders.ts` (`createOrderWithHistoryTransaction`) |
| 3. User pays | User sends crypto to `pay_address`. NOWPayments detects deposit and later performs conversion + payout to `payout_address`. | — |
| 4. Detection | Webhook or order GET (throttled) or cron reconciliation: `getPaymentStatus()` → `mapProviderStatusToInternal(payment_status)` → `processWebhookStatusUpdateAtomic(..., internal_status: mappedStatus)`. | `app/api/webhook/nowpayments/route.ts`, `app/api/order/[id]/route.ts`, `lib/order-reconciliation.ts` |
| 5. When provider is `finished` | `mappedStatus` = DONE; RPC `process_webhook_status_update` updates `orders.internal_status` to DONE. | `lib/status-mapping.ts`, `lib/db-orders.ts`, `supabase/migrations/044_webhook_guard_final_states.sql` |
| 6. Notifications | Webhook/order GET/cron call **`notifyOrderStatus()`** for CONFIRMING, DONE, etc. Telegram “Swap Hit” on first CONFIRMING (live only). **`recordOrderCompletion()`** when DONE. | `app/api/webhook/nowpayments/route.ts`, `lib/notifications.ts`, `lib/ledger.ts` |
| 7. Funds | NOWPayments has already (or is) sending converted amount to `payout_address`. We do not call any extra API. | — |

So the **automatic** user journey is fully implemented end-to-end.

### 2.2 Manual payout mode (intended vs current)

**Intended:**

1. Admin sets payout mode to **Manual** (Settings).
2. User creates exchange → payment created **without** `payout_address` / `payout_currency` → funds stay in NOWPayments balance.
3. User pays → provider goes to `confirming` then `finished` (or similar); we set **CONFIRMING** then **PAYMENT_CONFIRMED** or **MANUAL_REVIEW**, **not** DONE.
4. Admin sends payout from their own process, then clicks **Mark completed** → order goes to DONE.

**Current:**

1. Admin can set Manual in Settings; value is stored in `exchange_settings`.
2. Payment is still created **with** `payout_address` and `payout_currency` → NOWPayments will send to user when they mark payment finished (same as automatic).
3. When provider reports `finished`, we set **DONE** (no manual-mode branch).
4. Admin has **mark_completed**, **approve_manual_payout**, **enter_payout_hash** in `app/api/admin/orders/[id]/actions/route.ts`, but they are not tied to “only in manual mode” at creation or detection.

So: **manual flow is only partially implemented** (admin actions exist; creation and status detection ignore payout mode).

---

## 3. Detection Flow (Webhook, Polling, Cron)

### 3.1 Status mapping (provider → internal)

**File:** `lib/status-mapping.ts` — `mapProviderStatusToInternal(providerStatus)`

- `waiting` → AWAITING_DEPOSIT  
- `confirming` → CONFIRMING  
- `confirmed` → PAYMENT_CONFIRMED  
- `sending` → PROCESSING_BY_PROVIDER  
- `partially_paid` → PAYMENT_CONFIRMED  
- **`finished` → DONE**  
- **`success` → DONE**  
- `failed` → FAILED  
- `expired` → EXPIRED  
- `refunded` → EXPIRED  

There is **no** parameter for payout mode and **no** branch that maps `finished`/`success` to anything other than DONE. The comment “In manual mode, this should NOT auto-advance to DONE” is not implemented.

### 3.2 Webhook

**File:** `app/api/webhook/nowpayments/route.ts`

- Reads `payment_status` from body, loads order by `payment_id`, verifies signature.
- `mappedStatus = mapProviderStatusToInternal(paymentStatus)` (no payout mode).
- `processWebhookStatusUpdateAtomic(..., internalStatus: mappedStatus)`.
- On status change: Telegram (CONFIRMING, live only), `recordOrderCompletion` (DONE), `notifyOrderStatus` (CONFIRMING, PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, DONE, EXPIRED).

**No** call to `getPayoutMode()` or `isAutomaticPayoutEnabled()`.

### 3.3 Order GET (polling sync)

**File:** `app/api/order/[id]/route.ts`

- For NEW/AWAITING_DEPOSIT/CONFIRMING, after throttle: `getPaymentStatus()` → `mapProviderStatusToInternal(providerStatus)` → `processWebhookStatusUpdateAtomic(..., internalStatus: mappedStatus)` → `notifyOrderStatus` if status changed.

**No** payout-mode check.

### 3.4 Reconciliation cron

**File:** `lib/order-reconciliation.ts` — `runOrderReconciliation()`

- First pass: stale orders (NEW/AWAITING_DEPOSIT/CONFIRMING, 15+ min) → `getPaymentStatus()` → `mapProviderStatusToInternal()` → `processWebhookStatusUpdateAtomic()` → `notifyOrderStatus()`.
- Second pass: stale paid orders (PAYMENT_CONFIRMED, MANUAL_REVIEW, PROCESSING_BY_PROVIDER, 25+ min) → same flow; when provider returns `finished`/`success`, sets DONE.

**No** payout-mode check. Comment says “When provider says finished/success, set DONE so cron can complete without admin (funds-release guarantee)” — i.e. current design is “always complete when provider says finished”.

### 3.5 Admin resync and force-provider-sync

- **Resync:** `app/api/admin/orders/[id]/actions/route.ts` — uses `getPaymentStatus()` then **`updateOrderStatus()`** (app-level state machine).  
- **Force-provider-sync:** `app/api/admin/orders/[id]/force-provider-sync/route.ts` — uses `getPaymentStatus()` then **`processWebhookStatusUpdateAtomic()`** with `mappedStatus = mapProviderStatusToInternal(providerStatus)`.

Neither checks payout mode. So if provider is `finished`, both can move the order to DONE.

### 3.6 Summary: manual vs automatic in detection

- **Automatic:** All detection paths map `finished`/`success` → DONE. ✅ Consistent.
- **Manual:** No path treats manual differently. `finished` still becomes DONE. ❌ Manual detection behavior is **not** implemented.

---

## 4. Database Behavior

### 4.1 Relevant columns

- **`orders.internal_status`** — source of truth for order state (NEW, AWAITING_DEPOSIT, CONFIRMING, PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, MANUAL_REVIEW, DONE, FAILED, EXPIRED).
- **`orders.provider_status`** — copy of last NOWPayments `payment_status`.
- **`orders.payment_mode`** — `live` or `sandbox` (where the payment was created).
- **`exchange_settings`** — global `payout_mode` (`manual` | `automatic`); **not** stored per order.

### 4.2 When DB is updated (confirming vs finished)

- **Confirming:** When provider sends `confirming`, `mapProviderStatusToInternal` returns CONFIRMING; webhook/order GET/cron call `processWebhookStatusUpdateAtomic` with `internal_status: 'CONFIRMING'` → RPC updates `orders.internal_status` to CONFIRMING.
- **Finished:** When provider sends `finished` (or `success`), mapped status is DONE; same RPC sets `internal_status` to DONE (unless order is already DONE/FAILED/EXPIRED — then guard leaves it unchanged).

### 4.3 Does manual payout mode prevent DONE?

**No.** No code path reads `getPayoutMode()` before calling `processWebhookStatusUpdateAtomic` or `updateOrderStatus`. The RPC does not receive or use payout mode. So **DONE is set whenever provider reports `finished`**, regardless of the current (or any) payout mode setting.

### 4.4 Per-order payout mode

There is **no** `payout_mode` (manual/automatic) on the `orders` table. Only the **global** setting in `exchange_settings` exists. So we cannot “this order was created in manual mode” without either storing it at creation time or inferring from global setting at detection time.

---

## 5. Required Fixes (Logic Currently Missing)

### 5.1 Payment creation — conditional payout params

**File:** `app/api/payment/route.ts` (exchange branch)

- After building `paymentParams` (before sandbox `case`), **read payout mode:**
  - `const payoutMode = await getPayoutMode();`  
  - Or `const automaticPayout = await isAutomaticPayoutEnabled();`
- **If automatic:** keep current behavior:  
  `payout_address: body.destination`, `payout_currency: body.receive_asset.toLowerCase()`.
- **If manual:** **omit** payout params so NOWPayments keeps funds in balance:
  - Do **not** set `paymentParams.payout_address` or `paymentParams.payout_currency` (or set to `undefined` and rely on `lib/nowpayments.ts` only adding them when present).

Example change (conceptual):

```ts
// After line 99 (currentPaymentMode), add:
const automaticPayout = await isAutomaticPayoutEnabled();

const paymentParams: any = {
  price_amount: parseFloat(priceAmount),
  price_currency: (body.price_currency || 'usd').toLowerCase(),
  pay_currency: body.send_asset.toLowerCase(),
  order_id: body.order_id,
  order_description: body.order_description || `Exchange ...`,
};
if (automaticPayout) {
  paymentParams.payout_address = body.destination;
  paymentParams.payout_currency = body.receive_asset.toLowerCase();
}
// else: do not add payout_address / payout_currency → manual (funds to balance)
```

Optional: persist payout mode on the order at creation (e.g. `orders.payout_mode` or `orders.automatic_payout`) so detection and admin can rely on “this order was created in manual mode” even if global setting later changes.

### 5.2 Webhook (and all detection paths) — manual: do not set DONE from provider

**Option A — Use global setting at detection time**

- In webhook (and similarly in order GET sync and reconciliation), **before** calling `processWebhookStatusUpdateAtomic`:
  - `const automaticPayout = await isAutomaticPayoutEnabled();`
  - If **manual** and `mappedStatus === 'DONE'`, **override** to a non-DONE status, e.g. **PAYMENT_CONFIRMED** or **MANUAL_REVIEW** (so order waits for admin **mark_completed**).
- Same override in `app/api/order/[id]/route.ts` and in `lib/order-reconciliation.ts` (both passes) so behavior is consistent.

**Option B — Use per-order payout mode (recommended if you add it)**

- When creating the order, store `payout_mode` (or `automatic_payout`) from current `getPayoutMode()`.
- In webhook/order GET/reconciliation, load the order (already done), then:
  - If `order.payout_mode === 'manual'` (or `!order.automatic_payout`) and `mappedStatus === 'DONE'`, override to PAYMENT_CONFIRMED or MANUAL_REVIEW.
- This way each order is resolved according to how it was created, not the current global setting.

**Concrete webhook change (Option A):**

In `app/api/webhook/nowpayments/route.ts`, after:

```ts
let mappedStatus = mapProviderStatusToInternal(paymentStatus) as InternalStatus;
```

add:

```ts
const automaticPayout = await isAutomaticPayoutEnabled();
if (!automaticPayout && mappedStatus === 'DONE') {
  mappedStatus = 'PAYMENT_CONFIRMED'; // or 'MANUAL_REVIEW'
}
```

Then pass this `mappedStatus` into `processWebhookStatusUpdateAtomic`. Apply the same logic in `app/api/order/[id]/route.ts` and in `lib/order-reconciliation.ts` (both stale-order and stale-paid-order loops).

### 5.3 Reconciliation second pass (paid-but-not-DONE)

Currently the second pass explicitly sets DONE when provider says `finished` to “complete without admin (funds-release guarantee)”. If we add manual behavior:

- When applying the manual override (e.g. do not set DONE when payout mode is manual), the second pass should **not** set DONE for manual orders; they stay in PAYMENT_CONFIRMED/MANUAL_REVIEW until admin runs **mark_completed**.

So the same `automaticPayout` / `order.payout_mode` check should be used in both reconciliation passes when `mappedStatus === 'DONE'`.

### 5.4 Summary of code changes

| # | File | Change |
|---|------|--------|
| 1 | `app/api/payment/route.ts` | Import `isAutomaticPayoutEnabled` (or `getPayoutMode`). In exchange branch, only set `payout_address` and `payout_currency` when automatic; omit for manual. Optionally store payout mode on order. |
| 2 | `app/api/webhook/nowpayments/route.ts` | After `mapProviderStatusToInternal`, if manual (global or per-order) and `mappedStatus === 'DONE'`, set `mappedStatus = 'PAYMENT_CONFIRMED'` (or MANUAL_REVIEW) before `processWebhookStatusUpdateAtomic`. |
| 3 | `app/api/order/[id]/route.ts` | Same override before `processWebhookStatusUpdateAtomic` when syncing from provider. |
| 4 | `lib/order-reconciliation.ts` | Same override in both passes (stale orders and stale paid orders) before calling `processWebhookStatusUpdateAtomic`. |
| 5 | (Optional) DB migration | Add `orders.payout_mode` or `orders.automatic_payout` and set at order creation; use in detection instead of global setting. |

---

## 6. Summary Table

| Question | Answer (from code) |
|----------|--------------------|
| Does payment creation read payout mode? | **Yes.** Exchange branch calls `getPayoutMode()` and only adds payout params when automatic (§7). |
| Are `payout_address` / `payout_currency` conditional? | **Yes.** Set only when `payoutMode === 'automatic'`; omitted for manual (§7). |
| When provider is `finished`, does order become DONE? | **Only when automatic.** For manual orders we override to PAYMENT_CONFIRMED in all detection paths (§7.4). |
| Does manual mode prevent DONE in detection? | **Yes.** Per-order `payout_mode === 'manual'` causes override to PAYMENT_CONFIRMED before DB update. |
| Where is payout mode stored? | **`exchange_settings`** (`key = 'payout_mode'`). Read via **`getPayoutMode()`** / **`isAutomaticPayoutEnabled()`** in `lib/payout-mode.ts`. |
| Does `mapProviderStatusToInternal` differ by mode? | **No.** It has no payout-mode parameter; `finished`/`success` always → DONE. |
| Admin actions for manual? | **Yes:** `approve_manual_payout`, `enter_payout_hash`, `mark_completed` in `app/api/admin/orders/[id]/actions/route.ts`. They do not depend on creation or detection using payout mode. |
| What is implemented vs missing? | **Automatic:** Creation and detection fully implemented. **Manual:** Setting and admin actions exist; **creation** (omit payout params) and **detection** (do not set DONE from provider when manual) were **missing** — see §7 for implementation. |

This audit reflects the **actual runtime behavior** and the minimal code changes needed to support true manual vs automatic payout flows.

---

## 7. Implementation Summary (Completed)

The following was implemented so that payout mode drives creation and detection.

### 7.1 Database

- **047_add_orders_payout_mode.sql** — adds `orders.payout_mode` TEXT CHECK (payout_mode IN ('manual', 'automatic')).
- **048_create_order_with_history_payout_mode.sql** — updates RPC `create_order_with_history` to accept and insert `payout_mode`.

### 7.2 Payment creation

- **app/api/payment/route.ts:** Imports `getPayoutMode()`. Exchange branch only adds `payout_address` and `payout_currency` when `payoutMode === 'automatic'`; for manual they are omitted. Passes `payoutMode` in `orderData` into `createOrderWithHistoryTransaction`.

### 7.3 Order model and RPC

- **lib/db-orders.ts:** `Order` has `payoutMode: 'manual' | 'automatic' | null`. `mapOrderRow` reads `row.payout_mode`. `createOrderWithHistoryTransaction` and `createOrder` accept and persist `payoutMode`.

### 7.4 Detection override (manual → do not set DONE)

After mapping provider status to internal, if **order.payoutMode === 'manual'** (or **order.payout_mode** for raw rows) and **mappedStatus === 'DONE'**, override to **PAYMENT_CONFIRMED** before updating. Applied in:

- app/api/webhook/nowpayments/route.ts
- app/api/order/[id]/route.ts (order GET poll sync)
- lib/order-reconciliation.ts (both passes; second pass uses `order.payoutMode === 'manual' ? 'PAYMENT_CONFIRMED' : 'DONE'`)
- app/api/admin/orders/[id]/force-provider-sync/route.ts
- app/api/admin/orders/[id]/actions/route.ts (resync)
- app/api/admin/webhooks/[id]/replay/route.ts
- app/api/admin/payments/[id]/verify/route.ts
- lib/sandbox-simulation.ts

### 7.5 Verified runtime flows

**Automatic:** User creates exchange → payment created with payout params → user pays → webhook/order GET/cron detects → provider `finished` → order DONE → notifications → NOWPayments has sent funds to user.

**Manual:** User creates exchange → payment created without payout params → user pays → provider `confirming`/`finished` → we set CONFIRMING then PAYMENT_CONFIRMED (never DONE from provider) → admin pays user → admin mark_completed → order DONE → notifications.

### 7.6 Legacy and risks

- **Legacy orders:** Pre-migration rows have `payout_mode` NULL; treated as non-manual (DONE allowed from provider).
- **Admin mark_completed:** Only way to set DONE for manual orders; unchanged.
- All detection and admin sync paths now respect per-order `payout_mode`.
