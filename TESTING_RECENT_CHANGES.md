# How to Test Recent Changes

This guide covers how to verify the payment, webhook, cron, auth, DB error, and API resilience changes.

---

## Prerequisites

1. **Migrations**
   ```bash
   npx supabase db push
   # Or apply manually: 041_create_order_with_history_rpc.sql, 042_process_webhook_atomic_rpc.sql, 043_add_verification_token_expires_at.sql
   ```

2. **Env**
   - `.env.local` with Supabase, NOWPayments (or sandbox), SMTP (optional), `CRON_SECRET` (optional for cron).
   - For production build: `PUBLIC_BASE_URL` must be a real URL (not localhost).

3. **Run app**
   ```bash
   npm run dev
   ```

---

## 1. Payment + order creation (no payment without order)

**What was changed:** Order + status history are created in one DB transaction. If the transaction fails, the API returns 500 and does not return the payment (orphan is logged).

**How to test**

- **Success path**
  1. Create an exchange/payment via your UI or:
     ```bash
     curl -X POST http://localhost:3000/api/payment -H "Content-Type: application/json" -d "{\"type\":\"exchange\",\"send_asset\":\"btc\",\"receive_asset\":\"usdttrc20\",\"send_amount\":0.001,\"expected_receive\":50,\"destination\":\"YOUR_USDT_ADDRESS\",\"order_id\":\"test-order-$(date +%s)\"}"
     ```
  2. Expect 200 and a payload with `payment_id`, `pay_address`, etc.
  3. In DB: `orders` and `order_status_history` should have one new order and one history row with status `NEW` and source `system`.

- **Failure path (optional)**  
  Temporarily break the RPC (e.g. rename `create_order_with_history` in DB) and create a payment again. You should get 500 and message like "Order could not be saved. Please try again." and no new order in DB (payment exists at NOWPayments but we don’t return it).

---

## 2. Webhook atomic processing (idempotency + status + history)

**What was changed:** Webhook handler uses one RPC that does idempotency insert + order update + history in a single transaction. Same webhook twice = second time "already processed".

**How to test**

- **Success**
  1. Create a payment (step 1), note `payment_id` and `order_id`.
  2. Send a webhook (use NOWPayments sandbox or a small script that signs with your IPN secret):
     ```bash
     # Example: you need raw body + x-nowpayments-sig = HMAC-SHA512(rawBody, IPN_SECRET)
     # Use your app’s webhook URL, e.g. POST https://your-ngrok-url/api/webhook/nowpayments
     ```
  3. Check DB: `webhook_idempotency` has one row for that `payment_id`+`payment_status`; `orders` status updated; `order_status_history` has a new row for the new status.

- **Idempotency**
  - Send the same webhook payload (same `payment_id`, `payment_status`) again.
  - Expect 200 with message "Webhook already processed (idempotent)". DB should not get a second idempotency row or duplicate history.

- **Transaction rollback (optional)**  
  Temporarily break the RPC (e.g. make it fail after idempotency insert). First call fails with 500; retry same payload – should still be "new" (idempotency was rolled back), so no double-processing.

---

## 3. Webhook failure recovery (reconcile cron)

**What was changed:** Cron calls `runOrderReconciliation`: finds orders stuck in NEW/CONFIRMING >15 min, polls NOWPayments, updates via same atomic RPC (idempotent).

**How to test**

- **Call cron**
  ```bash
  curl -X GET "http://localhost:3000/api/cron/reconcile-orders" -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```
  If `CRON_SECRET` is not set, omit the header.

- **Expect** 200 and JSON like `{ "success": true, "processed": 0, "skipped": 0, "errors": 0, ... }`.

- **With stale orders (optional)**  
  In DB, set an order to `internal_status = 'NEW'`, `updated_at` = 20 minutes ago, and set a valid `payment_id`. Run cron again; it should poll NOWPayments and may update the order (or skip if already processed). Check logs for `[Cron] reconcile-orders` and `[Reconcile]`.

---

## 4. Email verification (expiry + single-use)

**What was changed:** Verification tokens have `verification_token_expires_at` (e.g. 24h). Verify-email rejects expired tokens and clears token on success (single-use).

**How to test**

- **Signup**
  - Register a new user (UI or signup API). Check DB: `users` row has `verification_token` and `verification_token_expires_at` set.

- **Valid token**
  - Open verify link: `/verify-email?token=<token_from_email_or_dev_log)>`. Expect success; DB: `email_verified = true`, `verification_token` and `verification_token_expires_at` = null.

- **Same link again**
  - Open same link again. Expect 200 "Email is already verified" (no DB change).

- **Expired token**
  - In DB set `verification_token_expires_at` to yesterday for a test user; use that token in `/verify-email?token=...`. Expect 400 with message like "This verification link has expired."

- **Resend**
  - Use "Resend verification" for an unverified user; new token should have a new expiry.

---

## 5. DB errors and user-safe messages (no silent failures)

**What was changed:** DB helpers throw `DbError` (or wrapped errors) on real failures; API routes catch and return user-safe messages (e.g. "Something went wrong. Please try again.").

**How to test**

- **Normal flows**
  - Signup, signin, get orders, get order by id, change password, etc. Should behave as before when DB is healthy.

- **Trigger a DB failure (optional)**
  - Stop Supabase or use an invalid DB URL; then e.g. signin or fetch orders. Expect 500 and a generic message like "Something went wrong. Please try again." (no raw DB or stack trace in response). Check server logs for the real error.

- **Not found vs failure**
  - Request order by wrong id: 404 "Order not found" (business result). Request with DB down: 500 user-safe message (failure).

---

## 6. NOWPayments timeouts and retries

**What was changed:** POST createPayment has a 30s timeout, no retry. GETs (getPaymentStatus, getExchangeLimits, etc.) have 15s timeout and retry with backoff (1s, 2s, 4s) on timeout/5xx/network errors only.

**How to test**

- **Happy path**
  - Create payment, get payment status, get exchange limits. Should work as before.

- **Timeout (optional)**
  - Use a proxy or mock that delays GET responses >15s; call getPaymentStatus. You should see retries in logs and then failure or success depending on mock.

- **No duplicate payments**
  - createPayment is not retried; only GETs are. So timeouts on POST will not create two payments.

---

## 7. SMTP timeouts and retry

**What was changed:** SMTP has connection/socket timeouts (10s / 30s) and a 25s send timeout; one retry only for connection errors (ECONNRESET, ETIMEDOUT, etc.).

**How to test**

- **Happy path**
  - Trigger an email (e.g. verification, order notification). It should send and logs should show success.

- **Connection failure (optional)**
  - Use wrong SMTP host/port or block network; send email. You should see one retry after 2s then failure, and no duplicate email (retry only on connection error before success).

---

## 8. Quick smoke checklist

| Area              | Action                          | Expected |
|-------------------|----------------------------------|----------|
| Payment           | Create exchange/payment         | 200, order + history in DB |
| Webhook           | Send same IPN twice             | First 200 updated, second 200 "already processed" |
| Reconcile cron    | GET /api/cron/reconcile-orders  | 200, JSON with processed/skipped/errors |
| Auth              | Signup → verify link             | Verified; same link again = "already verified" |
| Auth              | Verify with expired token        | 400 "expired" |
| API error         | Call any API with DB down        | 500, user-safe message only |
| Build             | `npm run build`                 | Passes if PUBLIC_BASE_URL is production URL |

---

## Running the app and build

```bash
# Development (localhost allowed)
npm run dev

# Production build (needs PUBLIC_BASE_URL = production URL)
# Set in .env or export before:
# export PUBLIC_BASE_URL=https://yourdomain.com
npm run build
```

Use this file to walk through each feature and confirm everything is working as intended.
