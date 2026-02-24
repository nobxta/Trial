# Payment Success Flow — Deep Research

**Scope:** When a user pays and the order completes (payment success → order DONE), this doc answers:
1. **Frontend UI** — Does the UI update to show success? Is it fetchable?
2. **Backend** — Is the code path correct and data fetchable?
3. **Telegram** — Is a notification sent on Telegram when payment succeeds?

---

## 1. Summary (TL;DR)

| Question | Answer |
|----------|--------|
| **Frontend updates when payment succeeds?** | **Yes.** Order page polls `GET /api/order/[id]` every 3s (6s after payment detected). When backend sets status to DONE, the next poll returns DONE; UI shows "Exchange Complete!", stops polling, and can show confetti. |
| **Backend updates / fetchable?** | **Yes.** Status is updated via (1) NOWPayments webhook → `processWebhookStatusUpdateAtomic` → DONE, or (2) Order GET sync (throttled 15s) or (3) reconciliation cron. Order is always fetchable via `GET /api/order/[id]` with current DB state. |
| **Code broken?** | **No.** End-to-end path is implemented and documented (see `UI_REACTION_AUDIT_MATRIX.md`, `PAYOUT_ENGINE_END_TO_END.md`). |
| **Telegram on payment success (DONE)?** | **No.** Telegram is sent only when status **first** changes to **CONFIRMING** (first on-chain confirmation), not when the order becomes **DONE** (completed). So you get one "Swap Hit!" when payment is detected, but no second Telegram when the swap finishes. |

---

## 2. Frontend UI When Payment Succeeds

### 2.1 How the UI learns that payment succeeded

- **Source of truth:** `GET /api/order/[id]` returns `order.internalStatus` and `order.currentStep` from the database.
- **Polling:** The order page (`app/order/[id]/page.tsx`) calls `fetchOrder()` on load and then on an interval:
  - **POLL_FAST_MS = 3000** (3s) while status is NEW or AWAITING_DEPOSIT.
  - **POLL_NORMAL_MS = 6000** (6s) once status is CONFIRMING or beyond.
- When the backend has set the order to **DONE**, the next poll response includes `internalStatus: 'DONE'`. The UI then:
  1. Renders the **completed state**: "Exchange Complete!" hero, summary, "Start New Exchange" / "View Order History".
  2. Stops polling (`finalStatuses.includes('DONE')` → `clearInterval`).
  3. Can fire confetti once (when moving into CONFIRMING/PAYMENT_CONFIRMED/PROCESSING_BY_PROVIDER/MANUAL_REVIEW/DONE).

Relevant code:

```294:301:app/order/[id]/page.tsx
        const finalStatuses = ['DONE', 'FAILED', 'EXPIRED'];
        if (finalStatuses.includes(orderData.internalStatus)) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
```

```308:314:app/order/[id]/page.tsx
  const isCompleted = order.internalStatus === 'DONE';
  // ...
  if (isCompleted) {
    return (
      // ... "Exchange Complete!" UI
```

So: **frontend UI does update when payment succeeds**; it is driven entirely by the next successful GET response that returns `internalStatus: 'DONE'`. No code path is broken for this.

### 2.2 Visibility / tab switch

- On `document.visibilityState === 'visible'`, the page calls `fetchOrder()` once, so if the user was on another tab when the order went DONE, the UI updates on the next visibility change and/or the next scheduled poll (within a few seconds).

### 2.3 Is the order fetchable?

- **Yes.** `GET /api/order/[id]` reads from the database via `getOrderByOrderId(orderId)`. If the order exists and status was updated to DONE (by webhook, order GET sync, or cron), the response includes the updated status. There is no separate "broken" path that would make a completed order unfetchable.

---

## 3. Backend Updates When Payment Succeeds

### 3.1 How status becomes DONE

Three ways the order can move to DONE:

| Path | Trigger | File(s) |
|------|--------|--------|
| **Webhook** | NOWPayments sends IPN with `payment_status: 'finished'` or `'success'` | `app/api/webhook/nowpayments/route.ts` |
| **Order GET sync** | User/frontend calls GET; order is NEW/AWAITING_DEPOSIT/CONFIRMING; last update &gt; 15s ago; we call `getPaymentStatus()` and get `finished`/`success` | `app/api/order/[id]/route.ts` |
| **Reconciliation cron** | Cron runs; finds stale orders; `getPaymentStatus()` returns `finished`/`success` | `app/api/cron/reconcile-orders/route.ts` → `lib/order-reconciliation.ts` |

In all cases we map provider status to internal status (`mapProviderStatusToInternal`), then call `processWebhookStatusUpdateAtomic` (or equivalent) so the DB gets `internal_status = 'DONE'`, `user_status = 'Completed'`, etc. Manual payout mode overrides DONE to PAYMENT_CONFIRMED in webhook and order GET; cron and manual auto-complete have their own handling.

So: **backend updates are correct and consistent**; the order row is updated and is fetchable.

### 3.2 Side effects when status becomes DONE (webhook path)

In `app/api/webhook/nowpayments/route.ts`, when `statusChanged && newStatus === 'DONE'`:

1. **Ledger:** `recordOrderCompletion(...)` is called (idempotent).
2. **Email:** `notifyOrderStatus(userId, orderId, 'done', request)` is called (with idempotency in `lib/notifications.ts`), which sends the "Order X - Status Update" email for completed status.

So: **backend is not broken**; completion is recorded and the user is notified by email when the order is DONE.

---

## 4. Telegram Notifications

### 4.1 When is Telegram sent?

**Only in the webhook handler**, and **only when**:

- `statusChanged === true`
- `newStatus === 'CONFIRMING'`
- `order.paymentMode !== 'sandbox'` (live orders only)

Relevant code:

```385:417:app/api/webhook/nowpayments/route.ts
    // Telegram: "Swap Hit" only on FIRST real on-chain confirmation (CONFIRMING) for Live orders.
    if (
      statusChanged &&
      newStatus === 'CONFIRMING' &&
      order.paymentMode !== 'sandbox'
    ) {
      try {
        const sent = await sendTelegramNotification({ ... });
```

So:

- **Telegram is sent when payment is first detected on-chain (CONFIRMING),** not when the order completes (DONE).
- There is **no** Telegram notification when status becomes **DONE** or **PAYMENT_CONFIRMED**; the only Telegram message is the single "Swap Hit!" at CONFIRMING.

### 4.2 Is Telegram sent when “payment succeeds” (user paid, order completed)?

- **Interpretation 1 — “User paid and we detected it”:** Yes. When status first moves to CONFIRMING (live, non-sandbox), one Telegram "Swap Hit!" is sent. So “payment detected” is notified on Telegram.
- **Interpretation 2 — “Order completed / swap finished” (DONE):** No. When status becomes DONE, **no** Telegram is sent. Only email is sent via `notifyOrderStatus(..., 'done', ...)`.

So: **Telegram is not sent on “payment success” in the sense of order DONE;** it is only sent on first confirmation (CONFIRMING).

### 4.3 Other code paths (order GET, reconciliation)

- **Order GET sync** (`app/api/order/[id]/route.ts`): Calls `notifyOrderStatus` for email when status is updated to CONFIRMING, PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, DONE, EXPIRED. It does **not** call `sendTelegramNotification`. So status updates discovered via polling never trigger Telegram.
- **Reconciliation** (`lib/order-reconciliation.ts`): Same — only `notifyOrderStatus` (email), no Telegram.

So if the webhook is missed or delayed and the order is updated to DONE only via GET sync or cron, the user still gets email but **no** Telegram at all (and no Telegram at CONFIRMING either if that transition was also only seen via poll/cron). Telegram is strictly webhook-driven and CONFIRMING-only.

### 4.4 Doc vs code (TELEGRAM_NOTIFICATIONS.md)

- `docs/TELEGRAM_NOTIFICATIONS.md` says notifications run when status changes to **CONFIRMING or PAYMENT_CONFIRMED**.
- The **actual code** only checks `newStatus === 'CONFIRMING'`. So the doc is slightly off: only CONFIRMING triggers Telegram, not PAYMENT_CONFIRMED.

---

## 5. Conclusion

| Area | Status | Notes |
|------|--------|--------|
| **Frontend UI** | OK | Polls GET order; when response has `internalStatus: 'DONE'`, UI shows "Exchange Complete!" and stops polling. Fetchable, no broken path. |
| **Backend** | OK | Webhook / order GET sync / cron update order to DONE; ledger and email (DONE) run; data is fetchable. |
| **Telegram on “payment success”** | Only at first confirmation | Telegram is sent only when status **first** becomes **CONFIRMING** (live), not when it becomes **DONE**. So no Telegram when the order “succeeds” as completed; only email. |

If you want a Telegram alert when the order **completes** (DONE), you would need to add a second block in the webhook (and optionally in order GET sync / reconciliation) that calls `sendTelegramNotification` (or a new “order completed” message) when `newStatus === 'DONE'` (and optionally only for live orders).
