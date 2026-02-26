# Payment Status Flow — Root Cause Analysis & Fix

## Problem

Webhook is verified (signature OK, RPC runs, DB updated e.g. NEW → PAYMENT_CONFIRMED, logs show `status_updated`, 200 response), but the **UI does not reflect the updated status**.

---

## Phase 1 — Backend Validation (Findings)

### 1. Webhook updates the correct field

- **Table:** `orders` (not a separate `payments` table for status).
- **RPC:** `process_webhook_status_update` in `supabase/migrations/053_webhook_no_downgrade_guard.sql` runs:
  - `UPDATE orders SET internal_status = ..., user_status = ..., status = ..., provider_status = ..., ...`
- **Confirmed:** Webhook passes `internalStatus` (mapped from provider) into `processWebhookStatusUpdateAtomic` → RPC writes to `orders.internal_status`.
- **Logging added:** After webhook update we log `webhook_db_row_after_update` with `order_id`, `internal_status`, `updated_at`, `table: 'orders'` so you can confirm the exact row in DB after each webhook.

### 2. GET /api/order/[id] route

- **Fetches from:** `getOrderByOrderId(orderId)` → Supabase `from('orders').select('*').eq('order_id', orderId)`.
- **Returns:** `order.internalStatus` (and `order.userStatus`) in the JSON response.
- **Dynamic:** `export const dynamic = 'force-dynamic'` and `noStore()` so the route is never statically cached.
- **Caching headers:** Response sends `Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0, s-maxage=0`, `Pragma: no-cache`, `Expires: 0`. No caching intended.
- **Re-read before response:** We call `getOrderByOrderId(orderId)` again right before building the response so we return the latest row (avoids stale read if webhook just committed).
- **Logging added:** We log `order_get_raw_db_before_response` with `internal_status`, `user_status`, `updated_at`, `table: 'orders'` so you can see exactly what the API is about to return.

### 3. Polling logic

- **Override:** Polling does **not** override confirmed states. We check `isStatusDowngrade(currentInternal, mappedStatus)` before calling `processWebhookStatusUpdateAtomic`; if true we skip the RPC and log `status_downgrade_blocked`. The RPC also enforces no-downgrade via `internal_status_priority`.
- **When polling runs:** Only when Admin “Enable Polling” is ON **and** order is in `NEW` / `AWAITING_DEPOSIT` / `CONFIRMING` **and** last update was >15s ago. If polling is OFF, we never call the provider.
- **Logging added:** We log `order_get_polling_state` with `polling_enabled`, `internal_status_before_poll_block`, `would_run_poll`. We already log `status_downgrade_blocked` when a downgrade is blocked and `order_poll_sync_updated` when polling updates status.

---

## Phase 2 — Frontend Analysis (Findings)

### 1. Order page (app/order/[id]/page.tsx)

- **Fetch:** Uses `fetch(\`/api/order/${orderId}?t=${Date.now()}\`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })`. No static generation; component is `"use client"`. No ISR/revalidate.
- **Reads:** `apiOrder.internalStatus` (and we now normalize with fallback: `apiOrder.internalStatus ?? apiOrder.status ?? 'NEW'` so we never display undefined).
- **Display:** All status UI uses `order.internalStatus` (e.g. `getStatusLabel(order.internalStatus, isExpired)`, `getStatusType(order.internalStatus, ...)`). One place uses `getOrderStatusLabel(order.internalStatus) || order.status` (fallback only).

### 2. State and caching

- **State:** Single `useState<Order | null>(null)`; every successful fetch calls `setOrder(orderData)` with the new object. No SWR/React Query. Polling interval (2s when awaiting, 5s otherwise) calls `fetchOrder` which updates state from the API response.
- **Stale state:** If the API returns old data (e.g. cached response), the UI will show old status. So the fix is to ensure the API never returns cached data (headers + re-read) and that the client does not cache (cache: 'no-store', cache-busting `?t=`).

### 3. Browser verification

- **Logging added:** In development, we `console.log('[Order page] API response status', { orderId, internalStatus, fromApi: apiOrder.internalStatus })` so you can verify in the browser console that the API returned the correct status. If this log shows `PAYMENT_CONFIRMED` but the UI still shows “Awaiting Deposit”, the bug is in React render or another display path. If the log shows `NEW`/`AWAITING_DEPOSIT`, the bug is upstream (API/DB/cache).

---

## Phase 3 — Data Consistency & Environment

### 1. Direct DB check

- **How to verify:** In Supabase SQL editor run:  
  `SELECT order_id, internal_status, user_status, updated_at FROM orders WHERE order_id = 'YOUR_ORDER_ID';`  
  after the webhook. You should see `internal_status = 'PAYMENT_CONFIRMED'` (or the expected value) and a recent `updated_at`.
- **Background jobs:** No job in this codebase reverts `internal_status` after webhook. Polling only runs when “Enable Polling” is ON and only advances or skips (no-downgrade).

### 2. Environment mismatch

- **Risk:** Webhook and API could hit different DBs if e.g. Vercel webhook server and API server use different `SUPABASE_URL` / env (e.g. preview vs production). Ensure production webhook and production app use the same Supabase project (same env vars in Vercel production).

---

## Root Cause (Most Likely)

1. **Response caching**  
   The GET /api/order/[id] response was being cached (browser, CDN, or edge) so the client kept receiving an old body with `internal_status: 'NEW'` or `'AWAITING_DEPOSIT'` even after the webhook updated the DB.

2. **Stale read**  
   A single read at the start of the request could see the row before the webhook commit; without a re-read before response, we could return that stale value.

3. **Frontend fallback**  
   If the API ever returned a response where `internalStatus` was missing or under a different key, the UI could show a wrong/fallback value; we now normalize to `internalStatus ?? status ?? 'NEW'`.

---

## Fixes Implemented

| Area | Fix |
|------|-----|
| **Webhook** | Log `webhook_db_row_after_update` with exact `internal_status` and `updated_at` from the row returned by the RPC (confirms `orders` was updated). |
| **Order API** | Re-read order from DB right before building response; log `order_get_raw_db_before_response` with `internal_status`; log `order_get_polling_state` (polling_enabled, would_run_poll). |
| **Order API** | `noStore()`, `dynamic = 'force-dynamic'`, strong no-cache headers, `X-Order-Status` header for debugging. |
| **Frontend** | Normalize status: `internalStatus = apiOrder.internalStatus ?? apiOrder.status ?? 'NEW'` so we never display undefined. |
| **Frontend** | In dev, log API response status so you can confirm in browser that the API returned the correct value. |

---

## How to Debug Next Time

1. **After webhook:** Check logs for `webhook_db_row_after_update` → confirm `internal_status` and `updated_at` in DB.
2. **On next GET:** Check logs for `order_get_raw_db_before_response` → confirm the API is reading and about to return the same `internal_status`.
3. **In browser:** Open DevTools → Network → select a GET to `/api/order/[id]` → check response body `order.internalStatus` and header `X-Order-Status`. In dev, check console for `[Order page] API response status`.
4. **If API is correct but UI wrong:** Inspect React state and which component renders the status; ensure it uses `order.internalStatus` and re-renders when `order` changes.
5. **If API is wrong:** Check for caching (headers, CDN), replica lag (Supabase read replica), or wrong env (different DB for webhook vs API).

---

## Guarantee

- **Backend:** Webhook writes to `orders.internal_status` only; RPC and app layer prevent downgrades; GET reads from `orders` and re-reads before response with no-store and no-cache.
- **Frontend:** Fetches with no-store and cache-busting; normalizes and displays `order.internalStatus`; polling updates the same state from the same API.
- **Result:** Once the webhook has committed, the next GET (within the poll interval) should return the updated status and the UI should show it on the next render.
