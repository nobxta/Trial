# Incident Response: Failure Scenarios

This document maps **real user complaints** and **operational failures** to root cause, code path, database state, webhook/admin interaction, and what the user and admin see. No feature suggestions; incident response only.

---

## 1. “I PAID BUT IT STILL SAYS WAITING”

### What could cause this (all possibilities)

| Cause | Code path | Webhook | Cron fixes? |
|-------|-----------|---------|-------------|
| **Webhook never received** | NOWPayments did not send IPN (their outage, misconfiguration, or URL wrong). | Missing | Yes if order is **NEW** or **CONFIRMING**. No if order is **AWAITING_DEPOSIT** (cron does not select AWAITING_DEPOSIT). |
| **Webhook rejected (401)** | `app/api/webhook/nowpayments/route.ts`: signature invalid or missing → `NextResponse.json({ error: '...' }, { status: 401 })`. NOWPayments typically does **not** retry on 4xx. | Rejected | Same as above: yes for NEW/CONFIRMING, no for AWAITING_DEPOSIT. |
| **Webhook rejected (400)** | Missing `payment_id` or `payment_status` → 400. | Rejected | Same. |
| **Webhook 5xx** | Any uncaught error in handler or `processWebhookStatusUpdateAtomic` throws (e.g. DB down) → 500. Provider may retry. | Delayed or retried | If retry never succeeds, same as “never received” for cron. |
| **Order not found (200)** | `getOrderByPaymentId(paymentId)` returns null (e.g. webhook arrived before order commit, or payment_id mismatch). Handler returns **200** `{ received: true, message: 'Order not found' }` so NOWPayments does **not** retry. Idempotency is **not** written (RPC never called). | Consumed, not applied | Yes: order stays **NEW**; cron selects NEW and will call `getPaymentStatus` and apply. |
| **Idempotent-skipped** | Same (payment_id, payment_status) already in `webhook_idempotency`. RPC returns `already_processed: true`; order not updated. | Skipped (duplicate event) | No: status already applied from first delivery. If first delivery was “waiting” and we’re stuck at AWAITING_DEPOSIT, duplicate “waiting” doesn’t help; a **new** status (e.g. confirming) would be a new idempotency key and would apply. So “still waiting” from idempotent-skip only if we already applied an earlier status and the **latest** status from provider is still “waiting” (e.g. provider slow to confirm). |
| **Stuck at AWAITING_DEPOSIT** | We received “waiting” and updated to AWAITING_DEPOSIT. Later “confirming”/“confirmed” webhooks are lost or rejected. | Missing (for later events) | **No.** `findStaleOrders` in `lib/db-orders.ts` (lines 337–341) selects only `internal_status IN ('NEW', 'CONFIRMING')`. **AWAITING_DEPOSIT is not included.** So cron never re-polls for orders stuck at AWAITING_DEPOSIT. **System limitation.** |

### Whether cron reconcile fixes it or not

- **Order internal_status = NEW:** Cron (`app/api/cron/reconcile-orders/route.ts` → `lib/order-reconciliation.ts` → `findStaleOrders`) selects orders NEW or CONFIRMING, older than 15 min. It calls `getPaymentStatus(paymentId, order.paymentMode)` then `processWebhookStatusUpdateAtomic` with `statusSource: 'polling'`. So **yes**, cron can fix “still waiting” if the order is still **NEW** (no webhook ever applied) or **CONFIRMING** (e.g. confirmed event lost).
- **Order internal_status = AWAITING_DEPOSIT:** Cron does **not** select these orders. If “confirming”/“confirmed” was lost after we had applied “waiting”, **cron does not fix it.** Manual fix: admin **resync** (if order is not EXPIRED) or direct DB update + manual completion as needed.

### Evidence in DB and logs

| Evidence | Where |
|----------|--------|
| **orders** | `internal_status`, `user_status`, `provider_status`, `updated_at`, `payment_id`. If still NEW/AWAITING_DEPOSIT after user paid, something upstream failed. |
| **order_status_history** | Last row shows last applied status and source (webhook/polling/manual). If no row for CONFIRMING/PAYMENT_CONFIRMED after user claims payment, webhook for that status was never applied. |
| **webhook_idempotency** | Rows for (payment_id, payment_status). If “confirming” or “confirmed” has no row, that event was never successfully processed (rejected, 5xx, or order not found). |
| **Logs** | `app/api/webhook/nowpayments/route.ts`: console + `webhookLogger`. Look for: `signature_invalid`, `order_not_found`, 5xx stack; `lib/order-reconciliation.ts`: `[Reconcile] getPaymentStatus failed` for cron errors. |

### Classification

- **User error:** Only if user sent to wrong address or wrong network (order shows correct address; provider never sees funds). Then provider never sends confirming/confirmed → **provider delay / no event**.
- **Provider delay:** NOWPayments slow to detect/confirm; webhook will arrive later. Cron helps only for NEW/CONFIRMING.
- **System limitation:** AWAITING_DEPOSIT not in cron stale list; one-way stuck if later webhooks are lost.
- **Actual bug:** None in “idempotent-skip” itself; bug-like gap is **cron not including AWAITING_DEPOSIT** for recovery.

---

## 2. “ORDER EXPIRED BUT I PAID IN TIME”

### Timeline

- **T0:** User creates order. DB: `internal_status = NEW`, `created_at` set. Frontend: 15‑minute countdown from `created_at` (hardcoded in `app/order/[id]/page.tsx`, `defaultTimeLimit = 15 * 60`).
- **T1:** User sends funds before countdown hits 0. NOWPayments detects and may send **confirming** / **confirmed** (or later **expired** if their window is different).
- **T2:** Frontend countdown reaches 0. `isExpired` on order page is `order.internalStatus === 'EXPIRED' || (order.expiresAt && new Date(order.expiresAt) < new Date())`. `expiresAt` is **null** (not stored in DB). So user sees “Time Remaining 0:00” but status stays “Waiting for payment” / “Waiting for confirmation” until backend sets **EXPIRED**.
- **T3:** NOWPayments sends **payment_status: 'expired'** (their own window, which can be shorter or longer than 15 min, or clock skew). Webhook maps to **EXPIRED** and updates order. DB: `internal_status = EXPIRED`, `user_status = 'Expired'`. User on next poll sees “Expired” and “Payment Window Expired” even if they paid before their UI timer hit 0.

### Frontend vs backend timing mismatch

- **Frontend:** Fixed 15 minutes from `created_at`; not stored; no API to extend or sync. Purely cosmetic countdown.
- **Backend:** No `expires_at` on `orders`. **EXPIRED** is set only when webhook (or cron) receives provider status **expired** from NOWPayments. So “expiry” is **provider-driven**, not app-driven.

### Provider-driven expiry vs UI countdown

- If NOWPayments sends **expired** after the user paid (e.g. their window closed, or they expire after a different rule), we set **EXPIRED** and user sees “Expired.” So “I paid in time” can mean: (1) user paid before **our** 15‑min countdown ended, but (2) NOWPayments already sent **expired** (e.g. their window was shorter, or delay in our receiving “confirmed” then “expired”).

### Whether admin can safely recover the order

- **resync:** Blocked. `app/api/admin/orders/[id]/actions/route.ts` (lines 62–67): `if (action === 'resync' && (currentInternalStatus === 'EXPIRED' ...))` → 400 “EXPIRED orders cannot be resynced.”
- **mark_completed:** Blocked. Same file (lines 404–412): `allowedStatuses = ['PAYMENT_CONFIRMED', 'MANUAL_REVIEW', 'PROCESSING_BY_PROVIDER', 'CONFIRMING']`. **EXPIRED is not allowed.** So admin cannot use “Mark completed” from EXPIRED.
- **State machine:** `lib/order-state.ts`: **EXPIRED** has `STATE_TRANSITIONS['EXPIRED'] = []`. So no transition from EXPIRED to DONE/PAYMENT_CONFIRMED via `updateOrderStatus` (it enforces `canTransition` for non-webhook).
- **Safe recovery:** Only by **direct DB update** (e.g. set `internal_status = 'PAYMENT_CONFIRMED'` or `'CONFIRMING'`, `user_status` and `status` to match, `status_source = 'admin'`), then admin can use **mark_completed** from PAYMENT_CONFIRMED. Or add a dedicated “unexpire and complete” path. No such path exists in code today.

### What data proves the user paid in time

| Data | Location | Use |
|------|----------|-----|
| **payin_hash** | `orders.payin_hash` (from webhook or cron) | Blockchain tx id; proves payment was detected. |
| **provider_status** | `orders.provider_status` | Last status from NOWPayments (e.g. confirming, confirmed) before or after expired. |
| **order_status_history** | Rows with `source = 'webhook'` and `payment_status` | Order of events: e.g. confirming → confirmed → expired vs expired only. |
| **NOWPayments dashboard / API** | External | Confirm payment time vs their expiry window. |

If **payin_hash** or history shows **confirmed** (or **confirming**) before **expired**, that supports “paid in time” from a detection perspective; business rule (who wins: our UI timer vs provider expiry) is policy, not code.

### Classification

- **User error:** Only if they actually paid after provider’s window (e.g. sent very late).
- **Provider delay / rules:** NOWPayments expiry window or timing differs from our 15‑min UI; we follow provider.
- **System limitation:** No `expires_at` in DB; no way to “unexpire” via UI; recovery only via direct DB + mark_completed.
- **Actual bug:** None; design is provider-authoritative for EXPIRED.

---

## 3. “ADMIN MARKED PAID BUT USER DIDN’T SEE IT”

### Timeline

- **T0:** Admin runs **mark_completed** or **resync** for order. `app/api/admin/orders/[id]/actions/route.ts` updates order via `updateOrderStatus(..., { source: 'admin', updatedBy: adminId })`. DB: `internal_status`, `user_status`, `status`, `status_source = 'admin'`, `updated_at` updated.
- **T1:** User has order page open. Page polls **GET /api/order/[id]** every **3 seconds** (`app/order/[id]/page.tsx`, `setInterval(fetchOrder, 3000)`). No explicit `cache: 'no-store'` on `fetch`; default browser behavior applies.
- **T2:** Next poll returns 200 with updated order. Frontend does `setOrder(orderData)` unconditionally (no “skip if unchanged”).
- **T3:** User sees new status within one poll interval (up to ~3 s) after admin action.

### When the user can fail to see the update

| Case | Possible? | Reason |
|------|-----------|--------|
| **User not on order page** | Yes | They see update only when they open the order page again and a poll runs. |
| **Poll returns 404** | Yes | If order_id wrong or order deleted, they see “Order not found.” |
| **Poll returns 5xx/503** | Yes | Handler catches, `setIsSyncing(false)` and returns without updating state; user keeps old state. Next poll (3 s) can succeed. If **every** poll fails (e.g. API down), user never sees update until API recovers. |
| **Poll returns 200 but stale body** | Unlikely | GET /api/order/[id] reads from DB each time (`getOrderByOrderId`). No response caching in route. CDN or browser could cache GET; no `Cache-Control: no-store` in response. Theoretically possible; not implemented in code. |
| **Multiple tabs** | Yes | Each tab has its own interval. Both eventually get new data; one may be up to 3 s behind. |
| **User closed tab** | Yes | No more polls; they see update on next visit when they open the order page. |

### When this cannot happen

- It **cannot** happen that admin action succeeded (DB updated) and user **forever** sees old status while staying on the same order page with a healthy API. Within a finite number of 3 s polls, one will get 200 and latest order; state is overwritten.

### Classification

- **User error:** N/A (expectation of instant update without refresh is met by polling except when API fails).
- **Provider delay:** N/A.
- **System limitation:** No push; up to 3 s delay; 5xx can delay further.
- **Actual bug:** None. Only “didn’t see it” due to not being on page, closed tab, or sustained API failure.

---

## 4. “ORDER COMPLETED THEN REVERTED”

### How webhook authority causes this

- Webhook path does **not** use `updateOrderStatus`; it uses **processWebhookStatusUpdateAtomic** (RPC `process_webhook_status_update`). RPC has **no** check for current status or `status_source`; it applies the incoming **internal_status** from the webhook payload.
- So: order is **DONE** (e.g. after admin **mark_completed**). NOWPayments sends another IPN with a **different** `payment_status` (e.g. **confirming**). Idempotency key is **(payment_id, payment_status)**. So (payment_id, **confirming**) is a **new** key; RPC inserts idempotency row and **updates** order to **CONFIRMING**. User on next poll sees “Waiting for confirmation” again.

### Which provider statuses can revert “completed”

- Any status that maps to an **earlier** internal state than DONE can revert the order if that event is delivered **after** we are already DONE:
  - **waiting** → AWAITING_DEPOSIT  
  - **confirming** → CONFIRMING  
  - **confirmed** → PAYMENT_CONFIRMED  
  - **sending** → PROCESSING_BY_PROVIDER  
  - **partially_paid** → PAYMENT_CONFIRMED  

Mapping in `lib/status-mapping.ts` → `mapProviderStatusToInternal`. So a **late or out-of-order** webhook (e.g. retry of “confirming” after “finished” was already sent and processed) will overwrite DONE.

### Why this is technically correct but confusing

- **Correct:** We treat each (payment_id, payment_status) as a fact; we don’t reject “confirming” because we’re already DONE. Idempotency prevents **duplicate** application of the **same** event, not “older” events.
- **Confusing:** User and admin see “Completed” then “Waiting for confirmation” with no explanation. No logic in code rejects “downgrade” statuses when current status is DONE/FAILED/EXPIRED.

### DB and logs

- **orders:** `internal_status` and `user_status` change back to CONFIRMING / “Waiting for confirmation”; `status_source = 'webhook'`.
- **order_status_history:** New row with status CONFIRMING, source webhook, payment_status confirming.
- **webhook_idempotency:** New row (payment_id, **confirming**).
- **Logs:** Webhook handler logs “Order status updated” / “status_updated”; provider_status in payload.

### Classification

- **User error:** No.
- **Provider delay / retries:** Late or duplicate “confirming” (or similar) from NOWPayments.
- **System limitation:** No “final state” guard in webhook RPC; any new status is applied.
- **Actual bug:** Design choice (webhook authoritative); no bug, but causes confusing UX.

---

## 5. DUPLICATE OR STUCK ORDERS

### order_id vs payment_id separation

- **order_id:** Client-generated (e.g. `Math.random().toString(36).substring(2, 8).toUpperCase()` in `ExchangeWidget`). Unique in `orders.order_id`. One per “create order” click.
- **payment_id:** From NOWPayments `createPayment` response. Stored in `orders.payment_id`. One per NOWPayments payment; 1:1 with deposit address.
- **Flow:** One “Exchange Now” → one `POST /api/payment` → one `createPayment()` → one payment_id, one order row (order_id + payment_id). User can click “Exchange Now” multiple times → multiple order_ids, multiple payment_ids, multiple deposit addresses.

### How idempotency works and where it doesn’t

- **Idempotency:** Table `webhook_idempotency`; unique (payment_id, payment_status). RPC `process_webhook_status_update` inserts then updates order. **ON CONFLICT (payment_id, payment_status) DO NOTHING** → if same event delivered twice, second is skipped. So **per payment**, we don’t apply the same status twice.
- **Does not:** Protect against “user created two orders and paid only one.” That’s two payments; two addresses. Idempotency doesn’t cross payments.

### Whether funds can be misattributed

- **No.** Each order has its own **payment_id** and **from_address** (deposit address from NOWPayments). Funds sent to order A’s address are tied to payment A; provider attributes to that payment_id. We never merge or reassign payment_id between orders. So “duplicate orders” = two orders, two addresses; if user pays only one, the other stays unpaid. No misattribution; possible **user confusion** (which order they paid).

### Stuck “duplicate” (one paid, one not)

- **DB:** Order 1: payment_id P1, internal_status DONE (or CONFIRMING etc.). Order 2: payment_id P2, internal_status NEW (or AWAITING_DEPOSIT). Different payment_ids, different addresses.
- **Evidence:** `orders.from_address`, `orders.payment_id`; compare to user’s tx. Only the order whose `from_address` matches the receiving address should show progress.

### Classification

- **User error:** Paying the wrong order’s address; or expecting one order when they created two.
- **Provider delay:** N/A for misattribution.
- **System limitation:** None for attribution; multiple orders are by design.
- **Actual bug:** None.

---

## 6. “USER SENT TO THE ADDRESS BUT FUNDS NEVER CREDIT”

### NOWPayments tolerance rules (not in this codebase)

- This app does **not** implement its own amount tolerance or partial-payment rules. It only maps **provider status** from NOWPayments. So whatever NOWPayments sends (e.g. **waiting**, **partially_paid**, **confirmed**, **failed**) is what we store and display. Tolerance and “minimum to credit” are **provider-side**; not in our code.

### Partial payments

- **partially_paid:** In `lib/status-mapping.ts`, **partially_paid** → **PAYMENT_CONFIRMED**. So we treat partial payment as “payment confirmed” and move to processing. We do **not** store “partial” as a separate state or amount; we don’t read partial amount from webhook payload for display. If NOWPayments later sends **failed** or **expired** (e.g. under minimum), we would then show Failed/Expired.

### Underpaid / overpaid handling

- **Not implemented** in app logic. We don’t compare user amount to expected amount; we don’t have states like “underpaid” or “overpaid.” Only provider status. So:
  - If provider sends **waiting** (e.g. underpaid): we stay AWAITING_DEPOSIT / “Waiting for payment.”
  - If provider sends **partially_paid:** we go PAYMENT_CONFIRMED.
  - If provider sends **confirmed:** we go PAYMENT_CONFIRMED.
  - If provider sends **failed:** we go FAILED.

### How this system represents those states

| Provider status | Internal status | User sees |
|-----------------|-----------------|-----------|
| waiting | AWAITING_DEPOSIT | Waiting for payment |
| confirming | CONFIRMING | Waiting for confirmation |
| confirmed | PAYMENT_CONFIRMED | Payment confirmed |
| partially_paid | PAYMENT_CONFIRMED | Payment confirmed |
| sending | PROCESSING_BY_PROVIDER | Processing |
| finished / success | DONE | Completed |
| failed | FAILED | Failed |
| expired | EXPIRED | Expired |

So “funds never credit” in our UI means: we never received a webhook (or cron never applied) that moved the order past “Waiting for payment” / “Waiting for confirmation.” That can be: (1) provider never detected the tx (wrong address/network/amount below their threshold), (2) provider detected but never sent IPN or we rejected it, (3) we’re stuck at AWAITING_DEPOSIT and cron doesn’t run for that status.

### Evidence

- **orders.from_address:** Must match what user sent to.
- **orders.payin_hash:** If set, provider detected a tx (from webhook/cron).
- **order_status_history:** Shows which statuses we applied; if no confirming/confirmed/partially_paid, provider never sent them or we never processed.
- **NOWPayments:** Check payment_id on their side for amount received, status, and any failure reason.

### Classification

- **User error:** Wrong address, wrong network, or amount below provider’s minimum/tolerance.
- **Provider delay / rules:** NOWPayments detection threshold, confirmation rules, or IPN not sent.
- **System limitation:** No partial/underpaid/overpaid states; we only reflect provider status; AWAITING_DEPOSIT not reconciled by cron.
- **Actual bug:** None; behavior is “mirror provider.”

---

## Summary table

| Scenario | Root cause (typical) | Cron helps? | Admin can fix via UI? | Category |
|----------|----------------------|-------------|------------------------|----------|
| I paid but still waiting | Webhook lost/rejected; or stuck at AWAITING_DEPOSIT | Only if NEW or CONFIRMING | resync if not EXPIRED | Provider / system limitation |
| Order expired but I paid in time | Provider sent expired; UI timer ≠ provider window | N/A | No (EXPIRED blocked) | System limitation |
| Admin marked paid, user didn’t see | Not on page, closed tab, or API 5xx | N/A | N/A (eventually consistent) | Operational / expectation |
| Completed then reverted | Late/retry webhook with earlier status | N/A | resync can re-apply current provider status | Provider delay / design |
| Duplicate/stuck orders | Two orders, two addresses; user paid one | N/A | N/A (no misattribution) | User error / expectation |
| Sent to address, never credit | Provider never confirmed or we never got event | Only NEW/CONFIRMING | resync if not EXPIRED | Provider / user / system limitation |

---

**File references:**  
Webhook: `app/api/webhook/nowpayments/route.ts`.  
Cron: `app/api/cron/reconcile-orders/route.ts`, `lib/order-reconciliation.ts`, `lib/db-orders.ts` (`findStaleOrders`).  
Admin actions: `app/api/admin/orders/[id]/actions/route.ts`.  
State machine: `lib/order-state.ts`.  
Status mapping: `lib/status-mapping.ts`.  
Order page polling: `app/order/[id]/page.tsx`.  
RPC: `supabase/migrations/042_process_webhook_atomic_rpc.sql`.
