# Payment Status Lifecycle — Full Audit

This document is the single source of truth for internal statuses, provider mapping, transitions, and system behavior. It is derived from the codebase (status-mapping, order-state, webhook, order GET, reconciliation, cron, admin).

---

## 1. Internal statuses

All internal statuses (admin/technical) are defined in `lib/status-mapping.ts` and `lib/order-state.ts`:

| Internal status              | Priority | Final? | User-facing label        |
|-----------------------------|----------|--------|---------------------------|
| `NEW`                       | 0        | No     | Awaiting deposit          |
| `AWAITING_DEPOSIT`          | 1        | No     | Awaiting deposit          |
| `CONFIRMING`                | 2        | No     | Confirming on Chain       |
| `PAYMENT_CONFIRMED`         | 3        | No     | Swap in Progress          |
| `PROCESSING_BY_PROVIDER`    | 4        | No     | Swap in Progress          |
| `MANUAL_REVIEW`             | 4        | No     | Swap in Progress          |
| `DONE`                      | 5        | **Yes**| Completed                 |
| `FAILED`                    | 5        | **Yes**| Failed                    |
| `EXPIRED`                   | 5        | **Yes**| Expired                   |

There is no separate internal status “PROCESSING” — the in-progress states are `PAYMENT_CONFIRMED`, `PROCESSING_BY_PROVIDER`, and `MANUAL_REVIEW`.

---

## 2. Per-status: when set, triggers, backend actions, finality, further transitions

### NEW
- **When set:** Order creation only (`createOrderWithHistoryTransaction` with `internalStatus` default `'NEW'`).
- **Triggers:** N/A (initial state).
- **Backend actions:** None specific to status.
- **Final:** No.
- **Further transitions:** → AWAITING_DEPOSIT, CONFIRMING, EXPIRED, FAILED (see §4).

### AWAITING_DEPOSIT
- **When set:** Webhook or polling when provider sends `payment_status: waiting`; mapped via `mapProviderStatusToInternal('waiting')`.
- **Triggers:** NOWPayments IPN or GET payment status returns `waiting`.
- **Backend actions:** RPC `process_webhook_status_update` (idempotency by `payment_id` + `payment_status`); optional payin_hash/from_address; no email in webhook list (only CONFIRMING+).
- **Final:** No.
- **Further transitions:** → CONFIRMING, EXPIRED, FAILED.

### CONFIRMING
- **When set:** Webhook or polling when provider sends `payment_status: confirming`.
- **Triggers:** Provider reports payment detected, confirming on chain.
- **Backend actions:** Same RPC; Telegram “Swap hit” (live only); email if in notification list (`notifyOrderStatus` for CONFIRMING); `manual_auto_complete_at` is **not** set (only for PAYMENT_CONFIRMED/PROCESSING_BY_PROVIDER/MANUAL_REVIEW).
- **Final:** No.
- **Further transitions:** → PAYMENT_CONFIRMED, EXPIRED, FAILED.

### PAYMENT_CONFIRMED
- **When set:**  
  - Webhook/polling when provider sends `confirmed` or `partially_paid`.  
  - Manual payout: webhook/polling/reconciliation when provider sends `finished`/`success` are **remapped** to PAYMENT_CONFIRMED (not DONE).  
  - Cron auto-complete does **not** set this; it only consumes it (moves to DONE when `manual_auto_complete_at` reached).
- **Triggers:** Provider IPN or GET status `confirmed` / `partially_paid`; or (manual only) `finished`/`success` mapped down.
- **Backend actions:** RPC; sets `manual_auto_complete_at` = now + random 2–10 min (migration 055, all orders); Telegram “Payment confirmed”; email; no ledger (ledger only on DONE).
- **Final:** No.
- **Further transitions (state machine):** → PROCESSING_BY_PROVIDER, MANUAL_REVIEW, EXPIRED, FAILED. In practice, **cron** moves PAYMENT_CONFIRMED → DONE after 2–10 min via `updateOrderStatus(..., 'DONE', ..., { skipTransitionCheck: true })`, which is intentional and not in the strict state machine.

### PROCESSING_BY_PROVIDER
- **When set:** Webhook/polling when provider sends `payment_status: sending`.
- **Triggers:** Provider says payout is being sent.
- **Backend actions:** RPC; `manual_auto_complete_at` set if first time in this status (2–10 min); Telegram only for CONFIRMING/PAYMENT_CONFIRMED; email if in list.
- **Final:** No.
- **Further transitions:** → DONE, FAILED, EXPIRED.

### MANUAL_REVIEW
- **When set:** Admin or system (e.g. admin places order in review); provider does not send “manual_review” — this is app-side.
- **Triggers:** Admin action (or future rules).
- **Backend actions:** Same RPC path if ever set via atomic update; `manual_auto_complete_at` can be set when first entering this status (2–10 min).
- **Final:** No.
- **Further transitions:** → DONE, FAILED, EXPIRED.

### DONE
- **When set:**  
  - Webhook/polling when provider sends `finished` or `success` (and payout mode is **not** manual).  
  - Cron: `runManualPayoutAutoComplete` for orders with `manual_auto_complete_at <= now()` via `updateOrderStatus(..., 'DONE', { skipTransitionCheck: true })`.  
  - Admin: mark completed.
- **Triggers:** Provider “finished”/“success” (auto payout), or cron after 2–10 min, or admin.
- **Backend actions:** Webhook: `recordOrderCompletion` (ledger); email; order locked in RPC (final state). Cron: same ledger + notifyOrderStatus.
- **Final:** Yes. No further transitions.

### FAILED
- **When set:** Webhook/polling when provider sends `payment_status: failed`.
- **Triggers:** Provider reports payment failed.
- **Backend actions:** RPC only. **Email:** Webhook notification list does **not** include FAILED — so no automatic email for FAILED from webhook (potential gap).
- **Final:** Yes.
- **Further transitions:** None.

### EXPIRED
- **When set:**  
  - Webhook/polling when provider sends `expired` or `refunded` (mapped to EXPIRED).  
  - **Order GET (expiry-by-time):** When `expiresAt` has passed and `internal_status` is in `['NEW','AWAITING_DEPOSIT']` only; then `updateOrderStatus(orderId, 'EXPIRED', undefined, { source: 'system' })`.
- **Triggers:** Provider status or payment window passed (only from NEW/AWAITING_DEPOSIT).
- **Backend actions:** RPC or direct update; email if in notification list (EXPIRED is in list). No refund API call in codebase — refunds are provider-side; `refunded` is mapped to EXPIRED for display.
- **Final:** Yes.
- **Further transitions:** None.

---

## 3. NOWPayments provider_status → internal status

Mapping is in **`lib/status-mapping.ts`**, function **`mapProviderStatusToInternal`**:

| Provider status   | Internal status        |
|-------------------|------------------------|
| `waiting`         | AWAITING_DEPOSIT       |
| `confirming`      | CONFIRMING             |
| `confirmed`       | PAYMENT_CONFIRMED      |
| `sending`         | PROCESSING_BY_PROVIDER |
| `partially_paid`  | PAYMENT_CONFIRMED      |
| `finished`        | DONE                   |
| `success`         | DONE                   |
| `failed`          | FAILED                 |
| `expired`         | EXPIRED                |
| `refunded`        | EXPIRED                |
| (empty/unknown)   | NEW                    |

**Override (app-level, before calling RPC):**  
If `order.payoutMode === 'manual'` and mapped status would be `DONE`, it is changed to **PAYMENT_CONFIRMED** in:
- `app/api/webhook/nowpayments/route.ts`
- `app/api/order/[id]/route.ts` (polling)
- `lib/order-reconciliation.ts` (second pass)

So manual payout never goes to DONE from provider; only cron or admin sets DONE.

**Logic after mapping:**  
Same path for all: **`processWebhookStatusUpdateAtomic`** → Supabase RPC **`process_webhook_status_update`**. RPC enforces:
- Idempotency: `(payment_id, payment_status)` in `webhook_idempotency`; if already present, returns `already_processed: true`.
- No overwrite of final states: if current `internal_status` is DONE, FAILED, or EXPIRED, RPC returns current order and does not update.
- No-downgrade: `internal_status_priority(new) < internal_status_priority(old)` → return current order, no update.
- When new status is PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, or MANUAL_REVIEW: set `manual_auto_complete_at` = now + (2 + floor(random() * 9)) minutes if not already set.

---

## 4. Allowed state transitions

Defined in **`lib/order-state.ts`** (`STATE_TRANSITIONS`). Same status (idempotent) is always allowed.

| From                 | Allowed to                                                                 |
|----------------------|----------------------------------------------------------------------------|
| NEW                  | AWAITING_DEPOSIT, CONFIRMING, EXPIRED, FAILED                             |
| AWAITING_DEPOSIT     | CONFIRMING, EXPIRED, FAILED                                                |
| CONFIRMING           | PAYMENT_CONFIRMED, EXPIRED, FAILED                                        |
| PAYMENT_CONFIRMED    | PROCESSING_BY_PROVIDER, MANUAL_REVIEW, EXPIRED, FAILED                    |
| PROCESSING_BY_PROVIDER | DONE, FAILED, EXPIRED                                                   |
| MANUAL_REVIEW        | DONE, FAILED, EXPIRED                                                     |
| DONE / FAILED / EXPIRED | (none)                                                                  |

**Explicitly allowed:** All and only the transitions in the table above (plus same→same).

**Blocked by state machine:** Any transition not in the table (e.g. DONE → FAILED, CONFIRMING → NEW). Enforced in **`updateOrderStatus`** via `canTransition()` unless `skipTransitionCheck: true`.

**Special case — PAYMENT_CONFIRMED → DONE:**  
Not in `STATE_TRANSITIONS`. Cron and admin use **`updateOrderStatus(..., 'DONE', ..., { skipTransitionCheck: true })`**, so PAYMENT_CONFIRMED → DONE is allowed only via this bypass (by design).

**Downgrade prevention:**
- **App (webhook/polling):** Before calling the RPC, webhook and order GET use **`isStatusDowngrade(current, mapped)`**; if true, they do **not** call `processWebhookStatusUpdateAtomic` and log `status_downgrade_blocked`.
- **SQL (RPC):** **`process_webhook_status_update`** (053/055) uses **`internal_status_priority`**; if `v_new_pri < v_old_pri` it returns the current row and does not update. So downgrades are blocked at both app and SQL for the webhook/poll path.
- **Direct `updateOrderStatus`:** Used for expiry-by-time (system), cron DONE, admin. For non-webhook calls it uses `canTransition()` (no priority check). So downgrades via this path are blocked by the state machine (no backward edges), and final states are not updated by RPC at all.

---

## 5. System behavior by status

### CONFIRMING
- **UI:** “Confirming on Chain” / “Payment Detected” / “Waiting for confirmations...” (order-page-text, DepositAddressCard STATE_CONFIRMING).
- **Swap execution:** No swap is “triggered” in app code; provider handles chain confirmations. UI shows progress step 1 (Confirming).
- **Polling:** Yes, if admin enabled. Order GET only runs provider poll when status is in **POLL_SYNC_STATUSES** = `['NEW','AWAITING_DEPOSIT','CONFIRMING']`. So polling is still active for CONFIRMING.

### PAYMENT_CONFIRMED
- **Swap triggered immediately:** No in-app “swap” API; provider already has the funds. `manual_auto_complete_at` is set so cron will mark DONE 2–10 min later (no verification/hash required).
- **Idempotency:** Yes. Each (payment_id, payment_status) is stored in `webhook_idempotency`; duplicate webhooks/poll same status return `already_processed: true` and do not re-apply.
- **Polling disabled for this order:** Yes. Polling runs only for NEW, AWAITING_DEPOSIT, CONFIRMING. So once PAYMENT_CONFIRMED, order GET no longer calls NOWPayments for this order (only expiry check and re-read from DB).

### DONE
- **Payout verified:** Not by our app. We trust provider (finished/success) or cron/admin. We do not call a separate “verify payout” API; optional `payout_hash` can be stored if provided.
- **Order locked:** Yes. RPC refuses any update when current status is DONE (or FAILED/EXPIRED). Ledger entry and notifications are written.

### FAILED / EXPIRED
- **Refunds:** No automatic refund API in codebase. Provider may refund; we map `refunded` → EXPIRED. Refund flow would be provider- or admin-driven.
- **Order locked:** Yes (same RPC final-state guard).
- **Can they transition out?** No. Terminal; no transitions in state machine and RPC does not update final states.

---

## 6. Ambiguities and conflicting logic

### Status set by both webhook and polling
- **CONFIRMING, PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, DONE, FAILED, EXPIRED** can all be set by either webhook or polling (or reconciliation).  
- **Mitigation:** Idempotency per (payment_id, payment_status); no-downgrade at app and SQL; polling only for NEW/AWAITING_DEPOSIT/CONFIRMING so polling cannot overwrite PAYMENT_CONFIRMED/DONE with an older provider status.

### Possible overwrites
- **Without guards:** A bug or a direct DB update could overwrite. Application code: webhook and polling check downgrade; RPC enforces priority and final state. So “accidental” overwrite by webhook/poll is prevented.
- **Reconciliation second pass:** Uses same RPC; when provider says finished/success, automatic orders go to DONE, manual to PAYMENT_CONFIRMED. No-downgrade in RPC still applies.

### Missing transition guards
- **PAYMENT_CONFIRMED → DONE:** Intentionally not in state machine; cron and admin use `skipTransitionCheck: true`. Documented and consistent.
- **Expiry-by-time:** Only NEW and AWAITING_DEPOSIT can be set to EXPIRED by time; CONFIRMING cannot (by design), so no guard missing there.

### Other
- **FAILED not in webhook notification list:** Users do not get an automatic “Order failed” email from the webhook path. Consider adding FAILED to `notificationStatuses` in the webhook handler if you want that.

---

## 7. State transition diagram (text)

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                         TERMINAL                              │
                    │  DONE ──X  FAILED ──X  EXPIRED ──X  (no outgoing edges)      │
                    └─────────────────────────────────────────────────────────────┘
                                         ▲
         ┌───────────────────────────────┼───────────────────────────────┐
         │                               │                               │
    PROCESSING_BY_PROVIDER ──────────────┼───────────────────────────────┼──► DONE
    MANUAL_REVIEW ───────────────────────┘                               │
         │                                                                 │
         │    PAYMENT_CONFIRMED ──────────────────────────────────────────┤
         │         │                                                       │
         │         ├──► PROCESSING_BY_PROVIDER                             │
         │         ├──► MANUAL_REVIEW                                      │
         │         ├──► EXPIRED / FAILED                                   │
         │         └──► DONE (cron 2–10 min or admin only; skipTransitionCheck)
         │              ▲
         │              │
    CONFIRMING ─────────┘
         │
         ├──► PAYMENT_CONFIRMED
         ├──► EXPIRED / FAILED
         │
    AWAITING_DEPOSIT
         │
         ├──► CONFIRMING
         ├──► EXPIRED / FAILED
         │
    NEW  ├──► AWAITING_DEPOSIT
         ├──► CONFIRMING
         └──► EXPIRED / FAILED
```

(Expiry-by-time: NEW or AWAITING_DEPOSIT → EXPIRED when `expiresAt` passed, from Order GET.)

---

## 8. Dangerous gaps and recommendations

### Gaps
1. **FAILED not in webhook notification list** — Users may not get email when order fails. **Recommendation:** Add `FAILED` to the webhook `notificationStatuses` (and optionally to a dedicated “failure” template) if you want consistent user notification.
2. **No automated refund trigger** — Refunds are provider-side; we only map `refunded` → EXPIRED. Acceptable if refunds are handled outside the app; otherwise document or add a clear refund flow.
3. **Manual “manual_auto_complete_at”** — If an order is stuck in PAYMENT_CONFIRMED and `manual_auto_complete_at` was never set (e.g. migration before 055), cron will not pick it up. **Recommendation:** Ensure 055 (or equivalent) has been applied so all such orders get a timestamp, or add a fallback “if in PAYMENT_CONFIRMED and older than X min and manual_auto_complete_at is null, set it to now” in cron.

### Strengths
- Idempotency per (payment_id, payment_status).
- No-downgrade at both app and SQL for RPC path.
- Final states never overwritten by RPC.
- Polling only for early statuses; webhook is authoritative for later ones when both can see the same event.
- Clear separation: webhook/poll/reconcile use RPC; expiry and cron DONE use `updateOrderStatus` with explicit bypass where needed.

---

## 9. Production safety

**Verdict: The current design is production-safe for a crypto swap platform**, provided:

1. **CRON is running** — Reconcile-orders cron runs every ~2 minutes so PAYMENT_CONFIRMED → DONE happens within the 2–10 min window.
2. **Webhook URL and secret** are correct and verified (signature validation is in place).
3. **Admin “Enable Polling”** is used when you want order GET to backfill missed webhooks; when off, webhook-only is still consistent and downgrade-safe.
4. **Migration 055** (or equivalent) is applied so `manual_auto_complete_at` is set for all orders entering PAYMENT_CONFIRMED/PROCESSING_BY_PROVIDER/MANUAL_REVIEW.

Optional hardening: add FAILED to notifications; document or implement refund handling; add a one-off or fallback to set `manual_auto_complete_at` for old PAYMENT_CONFIRMED orders that lack it.
