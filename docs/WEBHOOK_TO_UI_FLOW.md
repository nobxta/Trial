# Webhook → Web UI: Payment Detection & Status Flow

This doc answers: **When a webhook hits, does the web app detect the payment and update the UI correctly?**

## Summary

**Yes.** Payment detection and status-driven UI work as intended:

1. **Webhook** updates the database (internal status, hashes, etc.).
2. **Frontend** polls `GET /api/order/[id]` every 3–6 seconds and overwrites local order state with the API response.
3. **UI** is driven entirely by `order.internalStatus` (and derived `currentStep`, `isPaymentReceived`, `isCompleted`): labels, timeline, deposit card copy, and full-page states (awaiting / confirming / completed / expired) all change when status changes.
4. **Backup:** If the webhook is delayed or fails, the same GET endpoint can **sync from NOWPayments** when the order is still in `NEW` / `AWAITING_DEPOSIT` / `CONFIRMING` and the last update was >15s ago, so the next poll can still pick up the payment.

---

## 1. Webhook (backend)

- **Route:** `POST /api/webhook/nowpayments`
- **File:** `app/api/webhook/nowpayments/route.ts`
- **Flow:**
  - Validates body (e.g. `payment_id`, `payment_status`).
  - Verifies signature (HMAC SHA-512 with IPN secret).
  - Loads order by `payment_id`; if not found, returns 503 (retry later).
  - Maps provider status → internal status via `mapProviderStatusToInternal(payment_status)`:
    - `waiting` → `AWAITING_DEPOSIT`
    - `confirming` → `CONFIRMING`
    - `confirmed` / `partially_paid` → `PAYMENT_CONFIRMED`
    - `sending` → `PROCESSING_BY_PROVIDER`
    - `finished` / `success` → `DONE`
    - `failed` → `FAILED`, `expired` / `refunded` → `EXPIRED`
  - Calls `processWebhookStatusUpdateAtomic()` which:
    - Uses DB RPC `process_webhook_status_update` (idempotent by payment_id + payment_status).
    - Updates `internal_status`, `user_status`, `provider_status`, `status_source`, optional `payin_hash` / `payout_hash` / `from_address`.
  - Returns 200 with `received: true` (or idempotent message).

So when NOWPayments sends “payment detected” or “confirming”, the DB is updated in one atomic step.

---

## 2. How the frontend gets the new status

- **No push:** The web app does not use WebSockets or Server-Sent Events. It only **polls**.
- **Polling:** `app/order/[id]/page.tsx`:
  - On load and when the tab becomes visible, it calls `fetchOrder()`.
  - It runs `setInterval(fetchOrder, POLL_FAST_MS)` (3s) when status is `NEW` or `AWAITING_DEPOSIT`, and `POLL_NORMAL_MS` (6s) otherwise.
  - Polling stops when `internalStatus` is `DONE`, `FAILED`, or `EXPIRED`.
- **Fetch:** `fetchOrder()` calls `GET /api/order/[id]`, then maps the response into local state and calls `setOrder(orderData)`. So **every poll replaces the whole order** with the API response (including `internalStatus`, `currentStep`, etc.).

So after the webhook updates the DB, the **next poll** (within 3–6 seconds) returns the new status and the UI re-renders with it.

---

## 3. Backup: GET sync from provider

- **File:** `app/api/order/[id]/route.ts`
- For orders in `NEW`, `AWAITING_DEPOSIT`, or `CONFIRMING`, if the order’s `updated_at` is older than 15 seconds, the GET handler:
  - Calls NOWPayments `getPaymentStatus(paymentId)`.
  - If the provider returns a new status, it calls the **same** `processWebhookStatusUpdateAtomic()` with `statusSource: 'polling'`.
  - Re-loads the order from the DB and returns it.

So even if the webhook was missed or delayed, the next time the user has the order page open and a poll runs, the backend can sync from the provider and return the updated status. The UI then updates on that poll.

---

## 4. UI behavior by status (design/code changes)

All of these are derived from `order.internalStatus` (and `order.currentStep` from the API):

| Source | What changes with status |
|--------|---------------------------|
| **Order page** | `getStatusLabel(internalStatus)`, `getStatusType(internalStatus)` → status badge and type (awaiting / confirming / exchanging / completed / expired). |
| **Order page** | `timelineStep` = `order.currentStep ?? getStepFromInternalStatus(internalStatus)` (0–3). |
| **Order page** | `isPaymentReceived` = CONFIRMING \|\| PAYMENT_CONFIRMED \|\| PROCESSING_BY_PROVIDER \|\| MANUAL_REVIEW \|\| DONE → drives confetti once and which content is shown. |
| **Order page** | Full-page branches: `isCompleted` (DONE) → success screen; `isExpired` → expired screen; else → main order view. |
| **OrderSummary** | Receives `status` and `statusType` from the page → different label and color for the status pill. |
| **ProgressTimeline** | Receives `currentStep`, `internalStatus`, `isExpired` → which step is active (0–3 or -1 if failed/expired). |
| **DepositAddressCard** | `getOrderStateKey(internalStatus)` → `ORDER_STATE_TEXT[stateKey]`: different **title** and **notice** per state: |
| | `STATE_AWAITING_DEPOSIT` → “Deposit {amount} {currency}”, “Est. Arrival: 1 Confirmation” |
| | `STATE_CONFIRMING` → “Payment Detected”, “Waiting for confirmations…” |
| | `STATE_EXCHANGING` → “Converting your assets”, “Exchange in progress.” |
| | `STATE_COMPLETED` → “Exchange complete”, “You received …”, “View on Explorer” |
| | `STATE_EXPIRED` → “Order expired”, “The 12-minute payment window has ended.” |
| **QR visibility** | Address/QR are shown only when `stateKey === "STATE_AWAITING_DEPOSIT"`; after payment detected they are hidden and the card shows the new state copy. |

So **code and design both change according to status**; there is no static “awaiting” view after the webhook (or GET sync) has updated the order.

---

## 5. Status mapping reference

- **Provider (NOWPayments)** → **Internal** → **User-facing (optional)**  
- `waiting` → `AWAITING_DEPOSIT` → “Awaiting deposit”  
- `confirming` → `CONFIRMING` → “Confirming on Chain”  
- `confirmed` / `partially_paid` → `PAYMENT_CONFIRMED` → “Swap in Progress”  
- `sending` → `PROCESSING_BY_PROVIDER` → “Swap in Progress”  
- `finished` / `success` → `DONE` → “Completed”  
- `failed` → `FAILED` → “Failed”  
- `expired` / `refunded` → `EXPIRED` → “Expired”  

Defined in `lib/status-mapping.ts` (`mapProviderStatusToInternal`, `getUserFacingStatus`, `getCurrentStep`).

---

## 6. Conclusion

- **Webhook:** Correctly validates, maps provider status to internal status, and updates the DB atomically.
- **Frontend:** Does not listen to the webhook directly; it **polls** GET order and replaces local state, so it sees the new status within one poll interval (3–6s).
- **Backup:** GET order can sync from NOWPayments when appropriate, so payment can be detected even if the webhook is missing or late.
- **UI:** Status and design (labels, timeline, deposit card, full-page states) are driven by `internalStatus` and `currentStep`; when the next poll returns the updated order, the UI reflects “payment hit” and subsequent states correctly.

So: **payment hit is detected (via webhook or GET sync), and the web UI updates and shows the right status and design** once the next poll runs.
