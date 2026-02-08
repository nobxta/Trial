# Pre-Flight Security & Reliability Audit

**Date:** 2025-02-02  
**Scope:** MintMove deployment readiness — Live risks not visible in Local/Sandbox testing.  
**Role:** Senior Security Engineer / Lead Full-Stack Architect (Web3/Crypto, Next.js).

---

## Summary: Vulnerabilities Found & Remediation

| Category | Finding | Severity | Remediation |
|----------|---------|----------|-------------|
| Console leaks | Webhook and db-orders logged `payment_id`, order fields, full payload/updateData | Medium | Removed or moved to structured logger only; no PII in console |
| Console leaks | Payment route logged IPN callback URL and orphan payment_id/order_id | Low | Removed URL log; orphan errors log message only |
| NEXT_PUBLIC_ | Script fallback to `NEXT_PUBLIC_NOWPAYMENTS_API_KEY` could expose key in client | High | Script uses only `NOWPAYMENTS_API_KEY` (server-only) |
| Sandbox isolation | Live orders could theoretically hit simulation path | High | Hard-coded Live wall: `if (order.paymentMode === 'live') return order` first |
| Telegram trigger | Fired on CONFIRMING, PAYMENT_CONFIRMED, DONE (up to 3 messages per order) | Low | Trigger only on first on-chain confirmation: `CONFIRMING` for Live |
| Admin / idempotency | Clarify that automated swaps complete via webhook; manual payout is optional | Low | Comment in admin actions; idempotency already in RPC |
| Ghost timer | Already correct; documentation only | — | Comment in OrderDetails: "Ghost timer kill" once CONFIRMING+ |
| Timeline text | Already past-tense ("Payment Confirmed", "Assets Swapped") | — | No change |

**Signature verification:** HMAC-SHA512 with `crypto.timingSafeEqual` is active for Live traffic; no changes required.

---

## Files Modified to Secure the Flow

- **`app/api/webhook/nowpayments/route.ts`** — Removed all console.log that leaked payment_id, order_id, payload, signature, or IPN secret; Telegram trigger only on `CONFIRMING` (first on-chain); GET handler comment only.
- **`lib/db-orders.ts`** — Removed verbose console.log (orderId, internal_status, updateData JSON, webhook persistence details).
- **`lib/sandbox-simulation.ts`** — Strict Live wall: `if (order.paymentMode === 'live') return order`; doc that 7–20 min auto DONE requires no admin click.
- **`app/api/payment/route.ts`** — Removed IPN callback URL log and payment_id/order_id from orphan error logs.
- **`components/OrderDetails.tsx`** — Comment: ghost timer killed once status is CONFIRMING or beyond.
- **`app/api/admin/orders/[id]/actions/route.ts`** — Comment: manual payout mode; automated swaps complete via webhook (idempotent).
- **`scripts/fetch-and-normalize-currencies.ts`** — (Prior audit) No `NEXT_PUBLIC_NOWPAYMENTS_API_KEY` fallback.
- **`docs/PRE_FLIGHT_SECURITY_AUDIT.md`** — This document: summary, files modified, checklist.

---

## 1. Secret Leakage

### Status: **Addressed**

- **NEXT_PUBLIC_ usage:** Only used for values the client legitimately needs:
  - `NEXT_PUBLIC_APP_URL` — base URL for links
  - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client (RLS protects data)
- **Fix applied:** `scripts/fetch-and-normalize-currencies.ts` no longer falls back to `NEXT_PUBLIC_NOWPAYMENTS_API_KEY`. It uses only `NOWPAYMENTS_API_KEY` (server-only). Using `NEXT_PUBLIC_` for the API key would expose it in the browser.
- **No hardcoded API keys or IPN secrets** were found; all come from `lib/env.ts` / `process.env`.

**Action for you:** In production (e.g. Vercel), do **not** set any `NEXT_PUBLIC_*` variable for NOWPayments API key or IPN secret. Open the site, press F12 → Network tab; if the NOWPayments API key appears in any request URL or response, it must be fixed (it must stay on the server).

---

## 2. Webhook Integrity (HMAC-SHA512)

### Status: **Verified & Hardened**

- **Verification:** `app/api/webhook/nowpayments/route.ts` correctly:
  - Builds canonical body (alphabetically sorted JSON keys per NOWPayments IPN docs)
  - Uses HMAC-SHA512 with the IPN secret
  - Validates signature format (128 hex chars)
  - Uses `crypto.timingSafeEqual` for comparison
- **Mode selection:** IPN secret is chosen by `payment_mode` from the order (sandbox vs live) so Live traffic is verified with the Live IPN secret.
- **Fixes applied:** Removed logging that could leak secrets or PII:
  - No full request headers, full payload, or raw body content
  - No signature value (received or calculated) in logs
  - No IPN secret (not even a prefix) in logs

If signature verification is broken, spoofed “Payment Success” could drain liquidity; the current implementation is correct for Live traffic.

---

## 3. 7–20 Minute Sandbox Simulation vs Live Orders

### Status: **Correctly isolated**

- **Logic:** `lib/sandbox-simulation.ts` → `maybeApplySandboxSimulation(order)`:
  - **Strict Live wall:** `if (order.paymentMode === 'live') return order;` then `if (order.paymentMode !== 'sandbox' || !order.sandboxCase) return order;`
  - So Live orders never get sandbox auto-complete or mock progress. Sandbox PAYMENT_CONFIRMED/PROCESSING_BY_PROVIDER auto-flip to DONE after 7–20 min (no admin click).
- **Call site:** Only `GET /api/order/[id]` calls `maybeApplySandboxSimulation(order)`. Live orders get the same call but return unchanged.
- **Conclusion:** A Live order never transitions to “Completed” unless a real finished IPN is received. The 7–20 min simulation runs only for sandbox orders.

---

## 4. Telegram Bot Security

### Status: **Correct & Updated**

- **Trigger:** "Swap Hit" is sent only on **first real on-chain confirmation** for Live orders (`newStatus === 'CONFIRMING'`). One message per order; no repeat on PAYMENT_CONFIRMED or DONE.
- **Message content:** USD value (when available), Pair (e.g. BTC ➡️ ETH), and direct block explorer link via `buildSwapHitMessage` in `lib/telegram.ts`.
- **Single recipient:** `TELEGRAM_CHAT_ID` from env; no sensitive user data (no email, no full wallet) in message or logs.

**Action for you:** Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in production env to your personal bot/chat so only you get alerts.

---

## 5. Race Conditions / “Ghost Timer”

### Status: **Correct**

- **Client:** `app/order/[id]/page.tsx` — `showTimer` is true only when `order.internalStatus === 'NEW' || order.internalStatus === 'AWAITING_DEPOSIT'`. Once status is CONFIRMING or beyond, the countdown is not shown and does not drive “expired”.
- **OrderDetails:** `components/OrderDetails.tsx` — Ghost timer kill: once status is CONFIRMING or beyond, timer is destroyed and “Expired” state is impossible from client.
- **Server:** `findOrdersEligibleForExpiryByTime` in `lib/db-orders.ts` only selects orders with `internal_status IN ('NEW', 'AWAITING_DEPOSIT')` and `expires_at < now`. So if a user pays at the 29th minute, status moves to CONFIRMING and the order is no longer eligible for time-based expiry; the “ghost timer” does not expire paid orders.

---

## 6. Database Integrity / Idempotency

### Status: **Correct**

- **Webhook idempotency:** `process_webhook_status_update` RPC (see `supabase/migrations/042_process_webhook_atomic_rpc.sql` and `044_webhook_guard_final_states.sql`) uses:
  - `INSERT INTO webhook_idempotency (payment_id, payment_status, order_id) ... ON CONFLICT (payment_id, payment_status) DO NOTHING`
  - So the same webhook (same `payment_id` + `payment_status`) is only processed once; duplicate IPNs return “already processed” and do not double-update or double-payout.
- **Order creation:** Each call to NOWPayments `createPayment` returns a new `payment_id`. Order creation does not key on `payment_id` for idempotency (orders are keyed by `order_id`). If the same payment were somehow created twice, you’d have two orders for one payment — edge case; the critical guarantee is webhook idempotency so the same “finished” IPN never pays out twice.

---

## Deployment-Ready Checklist

| Risk | Level | Status | Action |
|------|--------|--------|--------|
| Console / network leaks (API key in browser) | Medium | Addressed | Do not set `NEXT_PUBLIC_*` for NOWPayments; verify in F12 → Network after deploy |
| Notification flow (signature + Telegram) | Low | OK | Set production env: `NOWPAYMENTS_IPN_SECRET*`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| Order expiry (sandbox sim on Live) | High | OK | `paymentMode === 'sandbox'` guard is solid; no change needed |
| Manual payout / double send | Medium | OK | Webhook idempotency prevents double processing; no manual admin checks required for idempotency |
| Webhook signature / spoofing | High | OK | HMAC-SHA512 verified; no secret/signature in logs |

---

## Timeline Status (UI)

- **ProgressTimeline** (`components/ProgressTimeline.tsx`): Completed steps use past-tense labels: “Deposit Sent”, “Payment Confirmed”, “Assets Swapped”, “Completed”. No change required.

## Optional: Webhook GET Handler

`app/api/webhook/nowpayments/route.ts` exports a GET handler that returns “WEBHOOK OK” for reachability checks (no sensitive data). You can remove it to accept only POST if desired.
