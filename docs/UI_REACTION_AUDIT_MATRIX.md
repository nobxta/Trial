# UI Reaction Audit Matrix

Action → backend state → GET /api/order/[id] → order page UI → time to reflect.

---

## USER ACTIONS

### 1. User clicks “Exchange Now”

- **Backend state change:** Yes. Order created: `internal_status = NEW`, `user_status = 'Waiting for payment'`, `status_source = 'system'`. Row in `orders` and `order_status_history`.
- **GET /api/order/[id] returns different data?** N/A at click time (user is still on home page). After redirect to `/order/[orderId]`, first GET returns the new order.
- **Does order page UI visibly change?** User is navigated to order page. First load shows: status “Waiting for payment”, timeline step 0, countdown from 15 min, deposit address and QR, no “Expired” badge.
- **Time to reflect:** Immediate (first load after redirect). Components: full order page (OrderSummary, OrderDetails, QRCodeSection, ProgressTimeline). Trigger: `internalStatus`, `userStatus`, `currentStep`, `payAddress`, `createdAt` from GET response.

---

### 2. User reloads the order page

- **Backend state change:** None from reload.
- **GET /api/order/[id] returns different data?** Returns current DB state at reload time.
- **Does order page UI visibly change?** Yes. UI shows whatever the DB has at reload (status, step, countdown, QR, expired state). Any change that happened while the tab was open is now visible if it wasn’t yet polled.
- **Time to reflect:** Immediate (on load). Components: all. Trigger: full response from GET.

---

### 3. User switches browser tabs and comes back

- **Backend state change:** None from tab switch.
- **GET /api/order/[id] returns different data?** Same as current DB state when the next request runs.
- **Does order page UI visibly change?** Yes, if backend changed while tab was in background. On `document.visibilityState === 'visible'`, `fetchOrder()` runs once (`app/order/[id]/page.tsx` visibility listener). Next poll (up to 3 s) also runs. UI updates from that response.
- **Time to reflect:** Next fetch after visibility change (within ~3 s if a poll is due). Components: all that depend on order state. Trigger: `order` state from GET response.

---

### 4. User closes browser and reopens order URL

- **Backend state change:** None from close/reopen.
- **GET /api/order/[id] returns different data?** Returns current DB state at open time.
- **Does order page UI visibly change?** Yes. Same as reload: UI reflects current DB state.
- **Time to reflect:** Immediate (on load). Components: all. Trigger: full GET response.

---

### 5. User sends funds to the deposit address

- **Backend state change:** None from the user action itself. Change only when webhook or cron runs (e.g. waiting → confirming → confirmed).
- **GET /api/order/[id] returns different data?** No change until webhook/cron updates the order.
- **Does order page UI visibly change?** Yes, but only after backend updates. Then next poll gets new data; status text, timeline step, and (if we store it) payinHash update.
- **Time to reflect:** Next poll (~3 s) after webhook/cron updates DB. Components: status (OrderDetails / timeline), ProgressTimeline (step). Trigger: `internalStatus`, `userStatus`, `currentStep` from GET.

---

### 6. User sends LESS than required amount

- **Backend state change:** Depends on provider. May stay waiting, or get partially_paid/confirmed/failed. Only when webhook/cron runs.
- **GET /api/order/[id] returns different data?** No change until provider sends a status and we process it.
- **Does order page UI visibly change?** Yes only after we process a webhook/cron update. Then same as #5 (status, step). If provider never confirms, UI stays “Waiting for payment.”
- **Time to reflect:** Next poll after backend update, or never if provider never updates. Trigger: same as #5.

---

### 7. User sends MORE than required amount

- **Backend state change:** Same as #5; provider typically confirms. Only when webhook/cron runs.
- **GET /api/order/[id] returns different data?** Same as #5.
- **Does order page UI visibly change?** Same as #5.
- **Time to reflect:** Next poll after backend update. Trigger: same as #5.

---

### 8. User sends funds after frontend timer hits 0

- **Backend state change:** None from frontend timer. Timer is local (15 min from `createdAt`). Backend still NEW/AWAITING_DEPOSIT/CONFIRMING until webhook/cron. If provider later sends confirming/confirmed, we update. If provider sends expired, we set EXPIRED.
- **GET /api/order/[id] returns different data?** No change until webhook/cron. After that, GET reflects new status (e.g. CONFIRMING or EXPIRED).
- **Does order page UI visibly change?** (1) When timer hits 0: countdown shows 0:00; `isExpired` stays false until `internalStatus === 'EXPIRED'`, so status and “Expired” badge may still show “Waiting for payment.” (2) After webhook/cron: if status becomes CONFIRMING/PAYMENT_CONFIRMED/etc., UI updates on next poll (status, step). If status becomes EXPIRED, UI shows “Expired” and “Payment Window Expired” on next poll.
- **Time to reflect:** Countdown 0:00 is immediate (local). Backend-driven status/expired: next poll after webhook/cron. Trigger: `internalStatus`, `userStatus`, `currentStep`, `isExpired` from GET.

---

### 9. User sends funds after backend status becomes EXPIRED

- **Backend state change:** If provider later sends confirming/confirmed (e.g. late payment accepted), webhook is applied (webhook is authoritative). We can move from EXPIRED to CONFIRMING/PAYMENT_CONFIRMED. If provider never sends, state stays EXPIRED.
- **GET /api/order/[id] returns different data?** Yes if we applied a new webhook (different status). No if provider never sends.
- **Does order page UI visibly change?** Yes if backend moved from EXPIRED to another status: next poll shows new status and step; “Expired” badge and message disappear. No if backend stays EXPIRED.
- **Time to reflect:** Next poll after backend update, or never. Trigger: `internalStatus`, `userStatus`, `currentStep`, `isExpired` from GET.

---

## SYSTEM / PROVIDER ACTIONS (WEBHOOK)

### 10. Webhook: payment_status = waiting

- **Backend state change:** `internal_status = AWAITING_DEPOSIT`, `user_status = 'Waiting for payment'`, `status_source = 'webhook'`, `provider_status = 'waiting'`. Row in `order_status_history`, `webhook_idempotency`.
- **GET /api/order/[id] returns different data?** Yes: `internalStatus`, `provider_status`, `updatedAt`. `userStatus` and step may be same as NEW (both “Waiting for payment”, step 0).
- **Does order page UI visibly change?** Minimal. Status text and step can stay “Waiting for payment” and 0. Only `updatedAt`, `provider_status` differ; no user component shows provider_status. Countdown, QR unchanged.
- **Time to reflect:** Next poll (~3 s). Components: effectively none visible (same labels). Trigger: GET response; visible change only if something else (e.g. copy) depended on `updatedAt`.

---

### 11. Webhook: payment_status = confirming

- **Backend state change:** `internal_status = CONFIRMING`, `user_status = 'Waiting for confirmation'`, `status_source = 'webhook'`, `provider_status = 'confirming'`.
- **GET /api/order/[id] returns different data?** Yes.
- **Does order page UI visibly change?** Yes. Status text “Waiting for confirmation”, timeline step 1, countdown and QR unchanged.
- **Time to reflect:** Next poll (~3 s). Components: OrderDetails (status), ProgressTimeline (step). Trigger: `internalStatus`, `userStatus`, `currentStep` from GET.

---

### 12. Webhook: payment_status = confirmed

- **Backend state change:** `internal_status = PAYMENT_CONFIRMED`, `user_status = 'Payment confirmed'`, `status_source = 'webhook'`, `provider_status = 'confirmed'`.
- **GET /api/order/[id] returns different data?** Yes.
- **Does order page UI visibly change?** Yes. Status “Payment confirmed”, timeline step 2.
- **Time to reflect:** Next poll (~3 s). Components: OrderDetails, ProgressTimeline. Trigger: `internalStatus`, `userStatus`, `currentStep`.

---

### 13. Webhook: payment_status = sending

- **Backend state change:** `internal_status = PROCESSING_BY_PROVIDER`, `user_status = 'Processing'`, `status_source = 'webhook'`, `provider_status = 'sending'`.
- **GET /api/order/[id] returns different data?** Yes.
- **Does order page UI visibly change?** Yes. Status “Processing”, timeline step 3.
- **Time to reflect:** Next poll (~3 s). Components: OrderDetails, ProgressTimeline. Trigger: same.

---

### 14. Webhook: payment_status = finished / success

- **Backend state change:** Normally `internal_status = DONE`, `user_status = 'Completed'`, `status_source = 'webhook'`. In manual payout mode, overridden to PAYMENT_CONFIRMED or MANUAL_REVIEW.
- **GET /api/order/[id] returns different data?** Yes.
- **Does order page UI visibly change?** Yes. Status “Completed”, timeline step 4, polling stops (final status). If manual mode: “Payment confirmed” or “Processing”, step 2 or 3.
- **Time to reflect:** Next poll (~3 s). Components: OrderDetails, ProgressTimeline; polling stops. Trigger: `internalStatus`, `userStatus`, `currentStep`; final status clears interval.

---

### 15. Webhook: payment_status = expired

- **Backend state change:** `internal_status = EXPIRED`, `user_status = 'Expired'`, `status_source = 'webhook'`, `provider_status = 'expired'`.
- **GET /api/order/[id] returns different data?** Yes.
- **Does order page UI visibly change?** Yes. `isExpired` true: “Expired” badge, “Payment Window Expired” / “This payment window has expired…”, timeline step 0 with error style (red, X icon), QR section treated as expired, polling stops.
- **Time to reflect:** Next poll (~3 s). Components: OrderDetails, ProgressTimeline, QRCodeSection. Trigger: `internalStatus`, `isExpired` from GET.

---

### 16. Webhook arrives late (after admin action)

- **Backend state change:** Webhook is authoritative. Order is overwritten with webhook status (e.g. admin had set DONE; webhook sends confirming → we set CONFIRMING).
- **GET /api/order/[id] returns different data?** Yes (reverted or updated status).
- **Does order page UI visibly change?** Yes. Status and step revert/change to what webhook set (e.g. “Waiting for confirmation”, step 1). Polling resumes if status is no longer DONE/FAILED/EXPIRED.
- **Time to reflect:** Next poll (~3 s). Components: OrderDetails, ProgressTimeline. Trigger: `internalStatus`, `userStatus`, `currentStep` from GET.

---

### 17. Duplicate webhook with same payment_status

- **Backend state change:** None. Idempotency: (payment_id, payment_status) already in `webhook_idempotency`; RPC returns `already_processed: true`, no UPDATE.
- **GET /api/order/[id] returns different data?** No.
- **Does order page UI visibly change?** No. UI DOES NOT CHANGE. Expected (idempotent). Backend state unchanged; UI already matches.

---

## ADMIN ACTIONS

### 18. Admin clicks “Verify payment”

- **Backend state change:** None. Read-only: GET from NOWPayments, compare to DB, log to admin_action_logs. No update to `orders`.
- **GET /api/order/[id] returns different data?** No.
- **Does order page UI visibly change?** No. UI DOES NOT CHANGE. Expected (verify is read-only).

---

### 19. Admin clicks “Resync”

- **Backend state change:** Yes. `getPaymentStatus(paymentId)` then `updateOrderStatus(orderId, mappedStatus, ..., { source: 'admin', updatedBy: adminId })`. `internal_status`, `user_status`, `status`, `status_source = 'admin'`, `provider_status`, `updated_at` updated.
- **GET /api/order/[id] returns different data?** Yes (new status).
- **Does order page UI visibly change?** Yes. Status text, timeline step, and (if status is DONE/FAILED/EXPIRED) polling stops. Same as webhook-driven update.
- **Time to reflect:** Next poll (~3 s). Components: OrderDetails, ProgressTimeline. Trigger: `internalStatus`, `userStatus`, `currentStep` from GET.

---

### 20. Admin clicks “Mark Failed”

- **Backend state change:** `internal_status = FAILED`, `user_status = 'Failed'`, `status_source = 'admin'`, `updated_at`. State machine allows from non-DONE states.
- **GET /api/order/[id] returns different data?** Yes.
- **Does order page UI visibly change?** Yes. Status “Failed”, timeline step 0 (failed style), polling stops.
- **Time to reflect:** Next poll (~3 s). Components: OrderDetails, ProgressTimeline. Trigger: same.

---

### 21. Admin clicks “Approve Manual Payout”

- **Backend state change:** `internal_status = MANUAL_REVIEW`, `manual_review_required = true`, etc.; then `updateOrderStatus(..., 'MANUAL_REVIEW', ..., { source: 'admin' })`. `user_status = 'Processing'`.
- **GET /api/order/[id] returns different data?** Yes.
- **Does order page UI visibly change?** Yes. Status “Processing”, timeline step 3.
- **Time to reflect:** Next poll (~3 s). Components: OrderDetails, ProgressTimeline. Trigger: same.

---

### 22. Admin enters payout hash

- **Backend state change:** `orders.payout_hash`, `payout_hash_entered_at`, `payout_hash_entered_by` updated. `internal_status` unchanged.
- **GET /api/order/[id] returns different data?** Yes: `payoutHash` (and timestamps) in response.
- **Does order page UI visibly change?** No. UI DOES NOT CHANGE. No user-facing component on the order page displays `payoutHash` or `payinHash`. Backend state changed; GET returns different data; UI ignores it. Expected (payout hash is admin-only in this UI).

---

### 23. Admin clicks “Mark Completed”

- **Backend state change:** `internal_status = DONE`, `user_status = 'Completed'`, `status_source = 'admin'`, `updated_at`. Ledger and notifications may run.
- **GET /api/order/[id] returns different data?** Yes.
- **Does order page UI visibly change?** Yes. Status “Completed”, timeline step 4, polling stops.
- **Time to reflect:** Next poll (~3 s). Components: OrderDetails, ProgressTimeline. Trigger: same.

---

### 24. Admin locks the order

- **Backend state change:** `orders.locked = true`. No change to `internal_status` or `user_status`.
- **GET /api/order/[id] returns different data?** No. User GET handler (`app/api/order/[id]/route.ts`) does not include `locked` in the response. Only `getOrderByOrderId` → `mapOrderRow` has it; response object is built without it.
- **Does order page UI visibly change?** No. UI DOES NOT CHANGE. Backend state changed; API does not expose `locked` to user; UI cannot show it. Expected (lock is admin-only).

---

### 25. Admin unlocks the order

- **Backend state change:** `orders.locked = false`.
- **GET /api/order/[id] returns different data?** No (locked not in response).
- **Does order page UI visibly change?** No. UI DOES NOT CHANGE. Same as #24. Expected.

---

## CRON / SYSTEM ACTIONS

### 26. Reconciliation cron updates status

- **Backend state change:** Same as webhook path: `findStaleOrders` (NEW or CONFIRMING, older than 15 min), then `getPaymentStatus`, then `processWebhookStatusUpdateAtomic` with `statusSource: 'polling'`. `internal_status`, `user_status`, `status`, `status_source = 'polling'` (in RPC; note RPC sets status_source from params), `provider_status`, hashes, etc.
- **GET /api/order/[id] returns different data?** Yes.
- **Does order page UI visibly change?** Yes. Same as webhook: status text, timeline step, and if final status polling stops.
- **Time to reflect:** Next poll (~3 s). Components: OrderDetails, ProgressTimeline. Trigger: `internalStatus`, `userStatus`, `currentStep` from GET.

---

### 27. Cron runs but finds no change

- **Backend state change:** None. Either provider status same as DB, or `already_processed` (same payment_status already in idempotency), or no stale orders, or API error for that order.
- **GET /api/order/[id] returns different data?** No.
- **Does order page UI visibly change?** No. UI DOES NOT CHANGE. Expected.

---

### 28. Cron updates EXPIRED order to DONE (if possible)

- **Backend state change:** None. `findStaleOrders` in `lib/db-orders.ts` selects only `internal_status IN ('NEW', 'CONFIRMING')`. EXPIRED orders are never selected. Cron does not update EXPIRED orders.
- **GET /api/order/[id] returns different data?** N/A (no update).
- **Does order page UI visibly change?** N/A. This scenario does not occur in code. UI DOES NOT CHANGE (cron never runs this path).

---

### 29. Cron runs after admin override

- **Backend state change:** None for that order if admin set DONE/FAILED/EXPIRED. `findStaleOrders` only returns NEW and CONFIRMING. So an order already set to DONE/FAILED/EXPIRED by admin is not in the stale list; cron does not touch it.
- **GET /api/order/[id] returns different data?** No (cron didn’t update this order).
- **Does order page UI visibly change?** No. UI DOES NOT CHANGE. Expected (cron does not overwrite completed/failed/expired orders).

---

## Summary table

| # | Action | Backend change | GET different? | UI change? | Time to reflect |
|---|--------|----------------|----------------|------------|-----------------|
| 1 | User: Exchange Now | Yes (create) | Yes (on load) | Yes (full page) | Immediate (load) |
| 2 | User: Reload page | No | Current state | Yes (refresh) | Immediate |
| 3 | User: Tab switch back | No | Current when fetch runs | Yes if DB changed | Next fetch (~3 s) |
| 4 | User: Close/reopen URL | No | Current state | Yes (refresh) | Immediate |
| 5 | User: Sends funds | Only after webhook/cron | After update | Yes after update | Next poll after update |
| 6 | User: Sends less | Only after webhook/cron | After update | Yes after update or never | Next poll or never |
| 7 | User: Sends more | Only after webhook/cron | After update | Yes after update | Next poll |
| 8 | User: Sends after timer 0 | Only after webhook/cron | After update | Countdown 0 local; status when backend updates | Local immediate; status next poll |
| 9 | User: Sends after EXPIRED | Only if webhook with new status | Yes if updated | Yes if backend updated | Next poll or never |
| 10 | Webhook: waiting | Yes | Yes | Minimal (same labels) | Next poll |
| 11 | Webhook: confirming | Yes | Yes | Yes (status, step 1) | Next poll |
| 12 | Webhook: confirmed | Yes | Yes | Yes (status, step 2) | Next poll |
| 13 | Webhook: sending | Yes | Yes | Yes (status, step 3) | Next poll |
| 14 | Webhook: finished/success | Yes | Yes | Yes (status, step 4 or manual) | Next poll |
| 15 | Webhook: expired | Yes | Yes | Yes (Expired UI, step 0 error) | Next poll |
| 16 | Webhook: late (after admin) | Yes (overwrite) | Yes | Yes (revert/change) | Next poll |
| 17 | Webhook: duplicate same status | No | No | No | Never |
| 18 | Admin: Verify payment | No | No | No | Never |
| 19 | Admin: Resync | Yes | Yes | Yes | Next poll |
| 20 | Admin: Mark Failed | Yes | Yes | Yes | Next poll |
| 21 | Admin: Approve Manual Payout | Yes | Yes | Yes | Next poll |
| 22 | Admin: Enter payout hash | Yes (payout_hash) | Yes | No (not displayed) | Never (payout hash not displayed to user) |
| 23 | Admin: Mark Completed | Yes | Yes | Yes | Next poll |
| 24 | Admin: Lock | Yes (locked) | No (not in response) | No | Never |
| 25 | Admin: Unlock | Yes (locked) | No | No | Never |
| 26 | Cron: updates status | Yes | Yes | Yes | Next poll |
| 27 | Cron: no change | No | No | No | Never |
| 28 | Cron: EXPIRED→DONE | N/A (not in code) | No | No | N/A |
| 29 | Cron: after admin override | No (order not in stale list) | No | No | Never |

---

**Files:** Order page: `app/order/[id]/page.tsx`. GET order: `app/api/order/[id]/route.ts`. Polling/visibility: `app/order/[id]/page.tsx` (fetchOrder, setInterval 3000, visibilitychange). Components: `OrderDetails.tsx`, `ProgressTimeline.tsx`, `QRCodeSection.tsx`, `OrderSummary.tsx`. Status/step: `getStepFromInternalStatus` (page), `getUserFacingStatus` / `getCurrentStep` (backend). Cron: `lib/order-reconciliation.ts`, `lib/db-orders.ts` (`findStaleOrders`).
