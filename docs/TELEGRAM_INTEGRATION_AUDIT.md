# Telegram Integration Audit

Based on the code in `app/api/webhook/nowpayments/route.ts` and `lib/telegram.ts`.

---

## 1. Live mode logic

**Confirmed:** Notifications only trigger when **both**:

- The order is **live** (not sandbox), and  
- The status **transitions** to **CONFIRMING** or **PAYMENT_CONFIRMED**.

**Relevant code** (`app/api/webhook/nowpayments/route.ts`):

```ts
const telegramTriggerStatuses: InternalStatus[] = ['CONFIRMING', 'PAYMENT_CONFIRMED'];
if (
  statusChanged &&
  telegramTriggerStatuses.includes(newStatus as InternalStatus) &&
  order.paymentMode !== 'sandbox'
) {
  // ... sendTelegramNotification(...)
}
```

- **`statusChanged`**: `oldStatus !== newStatus` (so we only fire on a **transition**).
- **`telegramTriggerStatuses.includes(newStatus)`**: only **CONFIRMING** or **PAYMENT_CONFIRMED**.
- **`order.paymentMode !== 'sandbox'`**: only **live** orders (see §2).

So notifications run only for **live** orders when status **first** moves to confirming or confirmed.

---

## 2. Sandbox mode logic

**Is there any path for sandbox orders to trigger a notification?**  
**No.**

**Exact line that blocks sandbox:**

**File:** `app/api/webhook/nowpayments/route.ts`  
**Line 412:**  
`order.paymentMode !== 'sandbox'`

If `order.paymentMode === 'sandbox'`, this condition is false, the whole `if` block is skipped, and `sendTelegramNotification` is never called. There is no other call to `sendTelegramNotification` in the codebase (see §3).

---

## 3. Polling vs webhook

**Verified:** The Telegram alert **only** runs in the **webhook** route.

- **Only caller:** `sendTelegramNotification` is used in a single place:  
  `app/api/webhook/nowpayments/route.ts` (inside the POST handler, after a successful atomic status update).
- **Reconciliation (polling):** `lib/order-reconciliation.ts` calls `processWebhookStatusUpdateAtomic` and does **not** import or call `sendTelegramNotification` (or any Telegram API). So status updates from polling **do not** send Telegram messages.

Result: no duplicate notifications from the polling system; only IPN-driven updates in the webhook can trigger Telegram.

---

## 4. Signature failure (401)

**Confirmed:** If the NOWPayments IPN signature check fails, the handler returns **401** and **never** runs the Telegram logic.

**Flow:**

1. **Missing signature** (lines 186–195):  
   `return NextResponse.json({ error: 'Signature required' }, { status: 401 })`  
   → handler exits; no DB update, no Telegram.

2. **Invalid signature** (lines 214–226):  
   `return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })`  
   → handler exits; no DB update, no Telegram.

The Telegram block runs only **after**:

- Signature verification has passed (or was skipped in dev), and  
- `processWebhookStatusUpdateAtomic` has run successfully.

So on 401, Telegram is always skipped.

---

## 5. Test script

A one-off test script bypasses the webhook (and thus the sandbox/live check) and calls the Telegram send path directly so you can verify the bot receives messages:

- **Script:** `scripts/test-telegram.ts`
- **Run:** `npx tsx scripts/test-telegram.ts` (or `npm run test:telegram` if added).
- **Config:** Loads `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from `.env.local` (or `.env`). If either is missing, the script exits with a clear message.
- **Behavior:** Sends a single test message (“Test swap alert”) using the same `sendTelegramNotification` helper and payload shape, without going through the webhook or any sandbox/live check.

See the script header and `docs/TELEGRAM_NOTIFICATIONS.md` for env var details.
