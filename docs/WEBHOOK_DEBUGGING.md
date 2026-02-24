# Payment Detection & Webhook Debugging Guide

If you paid on NowPayments and the status shows as **confirming** or **finished** there, but your site still shows **Awaiting deposit** or never moves to **Completed**, the webhook from NowPayments may not be reaching your server or may be rejected. The app also uses **polling-based detection** as a fallback.

---

## Why it might seem like "the website doesn't support webhooks"

The app **does support webhooks**: there is a working endpoint at `POST /api/webhook/nowpayments` that receives NOWPayments IPN and updates orders. If webhooks aren’t working, it’s almost always one of these:

| Cause | What happens | Fix |
|-------|----------------|-----|
| **1. Webhook URL not reachable** | NOWPayments sends the IPN to the URL you gave at payment creation. If that URL is **localhost** or a **wrong domain**, their servers cannot reach your app → no webhook is ever received. | Set **`PUBLIC_BASE_URL`** (or `NEXT_PUBLIC_APP_URL`) to your **real public URL** (e.g. `https://mintmove.io`), **no trailing slash**. Use this in **production**; for local testing use a tunnel (e.g. ngrok) and set that URL. |
| **2. Running locally without a tunnel** | On `npm run dev`, the app may use `http://localhost:3000` as the base URL. NOWPayments cannot call localhost from the internet. | For local testing: run **ngrok** (or similar), then set `PUBLIC_BASE_URL=https://your-ngrok-url.ngrok-free.app` in `.env.local`. |
| **3. Wrong or missing IPN secret** | The webhook handler verifies the request with **HMAC SHA-512** using the IPN secret. If the secret in your env doesn’t match NOWPayments, the handler returns **401** and does **not** update the order. | In NOWPayments Dashboard → **Merchant** → **IPN Settings**, copy the **IPN Secret Key**. Set **`NOWPAYMENTS_IPN_SECRET_LIVE`** (or `NOWPAYMENTS_IPN_SECRET`) in your deployment env to that **exact** value. |
| **4. PUBLIC_BASE_URL not set in production** | Payment creation requires a public URL. If it’s missing in production, the payment route can throw; if it falls back to localhost, every payment gets an unreachable callback URL. | In Vercel (or your host): **Settings** → **Environment Variables** → add **`PUBLIC_BASE_URL`** = `https://yourdomain.com` (your real domain). Redeploy. |

After fixing the URL and IPN secret, **create a new payment** (old payments already have the wrong callback URL stored at NOWPayments). Then check server logs for `webhook_received` to confirm the webhook is hitting your server.

---

## Quick checklist (live payments)

1. **Webhook URL is reachable**
   - Your app must be deployed at a **public URL** (e.g. Vercel).
   - `PUBLIC_BASE_URL` (or `NEXT_PUBLIC_APP_URL`) must be that **exact** URL (e.g. `https://yourdomain.com`), with **no** trailing slash.
   - NowPayments will POST to: `{PUBLIC_BASE_URL}/api/webhook/nowpayments`
   - If the app runs on localhost or the URL is wrong, NowPayments **cannot** call your webhook → no status updates.

2. **IPN secret matches (live)**
   - In **NowPayments Dashboard** → **Merchant** → **IPN Settings**: copy the **IPN Secret Key**.
   - In your **environment** (e.g. Vercel → Project → Settings → Environment Variables), set:
     - `NOWPAYMENTS_IPN_SECRET_LIVE` **or** `NOWPAYMENTS_IPN_SECRET` to that **exact** value.
   - If the value differs or is missing, the webhook returns **401** and the order is **not** updated.

3. **Check server logs**
   - **Vercel:** Project → Logs → filter by `/api/webhook/nowpayments` or search for `webhook_received`, `signature_invalid`, `signature_missing`, `order_not_found`, `webhook_transaction_failed`.
   - Look for:
     - `"Webhook received"` → request reached your server.
     - `"Invalid webhook signature"` or `"Signature required"` → fix IPN secret (see step 2).
     - `"Order not found"` → webhook arrived before order was saved, or wrong `payment_id` (we now normalize it to string; if you still see this, check DB for that `payment_id`).
     - `"Webhook processed successfully"` or `"status_updated"` → webhook worked; if the UI still doesn’t update, check polling or cache.

4. **Admin panel**
   - **Admin** → **Webhooks**: see processed webhooks (`webhook_idempotency`). If a `payment_id` has no row for `confirming` or `finished`, that event never succeeded.
   - **Admin** → **Orders** → [your order]: use **Resync** to pull the latest status from NowPayments and update the order (good one-off fix).

---

## Common causes

| Symptom | Likely cause | What to do |
|--------|----------------|------------|
| Status never leaves “Awaiting deposit” | Webhook URL not reachable or wrong | Set `PUBLIC_BASE_URL` to your live URL; ensure no localhost/ngrok in production. |
| Status never leaves “Awaiting deposit” | 401 from webhook | IPN secret in env must **exactly** match NowPayments IPN Settings. |
| “Confirming” on NowPayments, not on site | Webhook rejected (401/500/503) or not called | Check Vercel logs for this route; fix URL or IPN secret; retry or use Resync. |
| “Finished” on NowPayments, not on site | Same as above | Same as above; use Admin → Order → Resync to sync once. |

---

## Resync (one-off fix)

For an order that is **finished** on NowPayments but still not completed on your site:

1. Open **Admin** → **Orders**.
2. Open the order.
3. Use **Resync** (or equivalent “Sync status from NowPayments”) so the backend fetches the current payment status and updates the order.

This does not fix the webhook; it only fixes that one order. You still need to fix URL and IPN secret so future payments update automatically.

---

## How payment detection works (webhook + polling)

1. **Webhook (primary):** NowPayments POSTs to `{PUBLIC_BASE_URL}/api/webhook/nowpayments` on status change. If this is reachable and the IPN secret matches, the order updates and the user gets an email.
2. **Order-page polling (fallback):** When the user has the order page open, `GET /api/order/[id]` runs every few seconds. For orders in NEW/AWAITING_DEPOSIT/CONFIRMING, the backend **syncs from NowPayments** at most once every 15 seconds and updates the DB. So even if the webhook never fires, the next poll can pick up the payment and send the confirmation email.
3. **Cron reconciliation (fallback):** `/api/cron/reconcile-orders` runs **every 5 minutes** (see `vercel.json`). It finds orders stuck in NEW/AWAITING_DEPOSIT/CONFIRMING for 15+ minutes, fetches status from NowPayments, updates the DB, and sends notifications. Ensures orders are updated even when the user closed the page and the webhook failed.
4. **Admin Resync:** Admin → Orders → [order] → **Re-sync Status** fetches the latest status from NowPayments and updates the order; confirmation email is sent when status changes to a notify-worthy state.

## Technical notes

- **Signature:** We accept both the **raw** request body and the **canonical** (alphabetically sorted keys) body for HMAC-SHA512 verification, so small serialization differences from NowPayments should not cause 401.
- **payment_id:** We normalize `payment_id` to a string for DB lookup so numeric values from NowPayments still find the order.
- **Idempotency:** Each `(payment_id, payment_status)` is processed once; duplicates are ignored.
- **Logging:** Webhook events use `webhookLogger` (search logs for `event: webhook_received`, `signature_verified`, `webhook_completed`, `signature_invalid`, `order_not_found`). Reconciliation uses `source: reconciliation`; order GET poll uses `source: order_get_poll`.
