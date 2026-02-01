# MintMove – Full-Stack Reverse-Engineering Audit

This document is a **reverse-engineering audit** of the existing MintMove crypto exchange codebase. It explains how the backend and frontend are implemented, how data flows, and where each responsibility lives—with **file-level traceability**.

---

## 1. BACKEND IMPLEMENTATION

### 1.1 Architecture Overview

- **Backend type:** Next.js **API Routes** only. There are **no Server Actions** used for order/payment flows; no separate backend service.
- **External API:** Payment and exchange limits are delegated to **NOWPayments** (create payment, get status, get min/max limits).
- **Database:** **Supabase (PostgreSQL)** via `supabaseAdmin` client. No ORM; **raw Supabase client** (`.from('orders')`, `.insert()`, `.update()`, `.rpc()`).
- **Auth:** Cookie/session-based; `getAuthUser()` / `requireAdminRole()` read session and return user/admin identity.

**Key files:**

| Responsibility | File(s) |
|----------------|--------|
| Supabase client | `lib/supabase.ts` (`supabaseAdmin`) |
| Auth (user) | `lib/auth.ts` (`getAuthUser`) |
| Admin auth | `lib/admin-auth.ts`, `lib/admin-rbac.ts` (`requireAdmin`, `requireAdminRole`) |
| NOWPayments client | `lib/nowpayments.ts`, `lib/nowpayments-config.ts` |

---

### 1.2 Where Transactions, Orders, and Payments Are Handled

| Flow | Entry point | Backend logic | DB / external |
|------|-------------|---------------|---------------|
| **Create exchange order** | `POST /api/payment` | `app/api/payment/route.ts` | NOWPayments `createPayment()` → then `createOrderWithHistoryTransaction()` (Supabase RPC) |
| **Payment status updates** | NOWPayments IPN | `POST /api/webhook/nowpayments` → `app/api/webhook/nowpayments/route.ts` | `processWebhookStatusUpdateAtomic()` (Supabase RPC): idempotency + order update + history |
| **User views order** | `GET /api/order/[id]` | `app/api/order/[id]/route.ts` | `getOrderByOrderId()` → read from `orders` |
| **Admin order actions** | `POST /api/admin/orders/[id]/actions` | `app/api/admin/orders/[id]/actions/route.ts` | `updateOrderStatus()`, direct `orders` update, ledger, notifications |

There is **no separate “transaction” or “payment” table**. One table, **`orders`**, stores both order and payment metadata; `payment_id` is the NOWPayments payment ID. “Payments” in the admin UI are **orders with `payment_id` not null**, projected into a payment-like view.

---

### 1.3 Where Database Logic Lives

- **Models/schemas:** No formal ORM models. Types are in **`lib/db-orders.ts`** (`Order` interface) and in **Supabase migrations** (table definitions).
- **Queries:** All in **`lib/db-orders.ts`**:
  - `getUserOrders()`, `getOrderById()`, `getOrderByOrderId()`, `getOrderByPaymentId()`
  - `createOrder()`, **`createOrderWithHistoryTransaction()`** (used by payment route)
  - `updateOrderStatus()`, **`processWebhookStatusUpdateAtomic()`** (used by webhook)
  - `findStaleOrders()`, `checkWebhookIdempotency()`, `recordWebhookIdempotency()`
- **RPCs (atomic transactions):**
  - **`create_order_with_history`** – insert order + first row in `order_status_history` (migration `041_create_order_with_history_rpc.sql`).
  - **`process_webhook_status_update`** – idempotency insert + order update + history row (migration `042_process_webhook_atomic_rpc.sql`).

**Relevant migrations:**

- `supabase/migrations/000_final_schema.sql` – `orders` table definition (and rest of schema).
- `supabase/migrations/028_rebuild_order_status_system.sql` – `internal_status`, `user_status`, etc.
- `supabase/migrations/039_allow_null_user_id_in_orders.sql` – anonymous orders (`user_id` nullable).
- `supabase/migrations/041_create_order_with_history_rpc.sql`, `042_process_webhook_atomic_rpc.sql` – RPCs above.

---

### 1.4 Services for Crypto Logic (Rates, Wallets, Addresses, Status)

| Concern | Implementation | File(s) |
|---------|----------------|---------|
| **Exchange rate (UI)** | Client-side: CoinGecko prices via `useCryptoPrices`; rate = sendPrice/receivePrice; fee via `applyFee()` | `hooks/useCryptoPrices.ts`, `lib/pricing.ts`, `components/ExchangeWidget.tsx` |
| **Min/max amount (limits)** | Server: NOWPayments API; optional DB cache | `lib/nowpayments.ts` (`getExchangeLimits`), `lib/db-exchange-limits.ts`, `app/api/exchange/limits/route.ts` |
| **Deposit/payout address** | From NOWPayments `createPayment` response (`pay_address`); stored in `orders.from_address` | `lib/nowpayments.ts`, `app/api/payment/route.ts` |
| **Payout destination** | User input in widget; sent as `payout_address` to NOWPayments and stored in `orders.to_address` | `components/ExchangeWidget.tsx`, `app/api/payment/route.ts` |
| **Status lifecycle** | Internal status in DB; mapping from NOWPayments status; user-facing labels | `lib/status-mapping.ts`, `lib/order-state.ts`, webhook + admin actions |

Supported assets and networks (IDs, symbols, networks) are in **`lib/supported-cryptos.ts`** and **`lib/supportedAssets.ts`** (NOWPayments-style IDs).

---

## 2. FRONTEND PAGES AND PURPOSE

### 2.1 Public Pages

| Route | Purpose | Data source | Key components |
|-------|---------|-------------|----------------|
| **`/`** | Home: exchange widget, trust badges, benefits, “Recent” transactions, FAQ | Widget: localStorage + `/api/exchange/limits`, `/api/auth/me`, `/api/account/addresses`. “Recent Transactions” is **fake/mock** data in component | `app/page.tsx`, `ExchangeWidget`, `RecentTransactions`, `FAQ` |
| **`/order/[id]`** | Order status: deposit address, QR, progress, countdown | `GET /api/order/[id]` every 3s until terminal status | `app/order/[id]/page.tsx`, `OrderDetails`, `QRCodeSection`, `ProgressTimeline` |
| **`/track-order`** | Track order by ID (entry point; actual data on `/order/[id]`) | N/A or same as order page | `app/track-order/page.tsx` |
| **`/sign-in`**, **`/sign-up`** | Auth | `POST /api/auth/signin`, `POST /api/auth/signup` | `app/sign-in/page.tsx`, `app/sign-up/page.tsx` |
| **`/verify-email`** | Email verification | `GET/POST /api/auth/verify-email`, resend | `app/verify-email/page.tsx` |
| **`/about`**, **`/faq`**, **`/privacy-policy`**, **`/support`** | Static/marketing | None | Corresponding `app/.../page.tsx` |
| **`/blog`**, **`/blog/[slug]`**, **`/blog/currencies`**, etc. | Blog | Likely local or CMS | `app/blog/...` |

### 2.2 Account (User Dashboard) Pages

| Route | Purpose | Data source |
|-------|--------|-------------|
| **`/account/orders`** | List user’s orders; filter by status; link to `/order/[orderId]` | `GET /api/account/orders` (uses `getUserOrders(userId, { status, limit, offset })`) |
| **`/account/addresses`** | Address book (CRUD) | `GET/POST /api/account/addresses`, `.../addresses/[id]` |
| **`/account/personal`** | Profile | `GET/PATCH /api/account/personal` |
| **`/account/affiliate`** | Affiliate dashboard | `GET /api/account/affiliate`, earnings, referrals |
| **`/account/api`** | API key management | Account API routes |
| **`/account/payouts`** | Payouts (affiliate) | Payouts API |

### 2.3 Admin Pages

| Route | Purpose | Data source |
|-------|--------|-------------|
| **`/admin`** | Admin dashboard | Various admin APIs |
| **`/admin/orders`** | List orders; filters (status, orderId, paymentId, showUnpaid, showAnonymous, reviewQueue) | Server: direct Supabase `from('orders')` in `app/admin/orders/page.tsx` (`getOrders(searchParams)`) |
| **`/admin/orders/[id]`** | Order detail: status, history, webhooks, notes; actions | `getOrderByOrderId()`, `order_status_history`, `webhook_idempotency`, `admin_notes`; actions via `POST /api/admin/orders/[id]/actions` |
| **`/admin/payments`** | List “payments” (orders with `payment_id`); filter paid vs all | Server: same `orders` table, filtered and projected in `app/admin/payments/page.tsx` (`getPayments(filter)`) |
| **`/admin/users`**, **`/admin/disputes`**, **`/admin/wallets`**, **`/admin/rates`**, **`/admin/security`**, **`/admin/settings`**, **`/admin/webhooks`**, **`/admin/email-logs`**, etc. | Various admin features | Corresponding admin API routes and Supabase tables |

---

## 3. USER FLOW: “Exchange Now”

End-to-end flow when the user selects send/receive crypto, enters destination address, and clicks **“Exchange Now”**.

### 3.1 Frontend (Immediate)

**File:** `components/ExchangeWidget.tsx` (button `onClick` ~lines 664–758).

1. **Guard:** If `isCreatingOrder` or validations fail, return (button is disabled when invalid).
2. **State:** `setIsCreatingOrder(true)`, `setOrderError(null)`.
3. **Re-validate limits:**  
   `GET /api/exchange/limits?send_asset=...&receive_asset=...&is_fixed_rate=...`  
   If response not OK or `limits` missing → set error, `setIsCreatingOrder(false)`, return.
4. **Amount vs limits:** If `amount < min` or `amount > max` → set error, `setIsCreatingOrder(false)`, return.
5. **Payload built:**  
   `type: "exchange"`, `send_asset`, `send_network`, `send_amount`, `receive_asset`, `receive_network`, `expected_receive`, `rate_type`, `destination`, `order_id` (client-generated, e.g. random string), `price_amount`, `price_currency`, `pay_currency`, `payout_address`, `payout_currency`.
6. **Request:**  
   `POST /api/payment` with `JSON.stringify(payload)`.
7. **Response handling:**
   - If not OK: parse JSON error → `setOrderError(...)`, `setIsCreatingOrder(false)`, scroll to error.
   - If OK but no `pay_address`: throw → same error path.
   - If OK and `pay_address` present: merge response into `orderData`, save to `localStorage` under `order_${orderId}`, **`router.push(\`/order/${orderId}\`)`**.  
   Note: `orderId` here is the **client-generated** `order_id` from the payload (e.g. from `Math.random().toString(36)...`), not the NOWPayments `payment_id`.

### 3.2 API / Backend Called

**File:** `app/api/payment/route.ts` – `POST` handler.

1. **Exchange detection:** `body.type === 'exchange'` or `body.send_asset` → treat as exchange.
2. **Validation:**  
   - `validateExchangeRequest(body)` (`lib/validation.ts`): required fields, amounts > 0, supported assets, destination address format.  
   - `price_amount` / `expected_receive` present and > 0.  
   - `getAssetNetworkById(send_asset/receive_asset)`; if invalid → 400.
3. **Limits:**  
   `getExchangeLimits(sendAsset.id, receiveAsset.id, isFixedRate)` (NOWPayments). If `send_amount` &lt; min or &gt; max → 400.
4. **Payment mode:** `getPaymentMode()` (live/sandbox); optional sandbox `case` from env.
5. **IPN URL:** `getPublicBaseUrl()` + `/api/webhook/nowpayments`; must not be localhost in production.
6. **Create payment:**  
   `createPayment(paymentParams)` in `lib/nowpayments.ts` → POST to NOWPayments `/payment`; returns `payment_id`, `pay_address`, etc.
7. **Auth:** `getAuthUser()` → `userId` or null (anonymous allowed).
8. **DB write:**  
   `createOrderWithHistoryTransaction(userId, orderData)` where `orderData` includes `orderId: body.order_id`, `paymentId: payment.payment_id`, `internalStatus: 'NEW'`, currencies, amounts, addresses, etc.  
   This calls Supabase RPC **`create_order_with_history`** (`lib/db-orders.ts`).
9. **Response:**  
   JSON with NOWPayments response plus exchange metadata (`type: "exchange"`, `send_asset`, `receive_asset`, `destination`, `status: "awaiting_payment"`, etc.). Frontend uses `pay_address` and stored `order_id` for the order page.

### 3.3 Validations (Summary)

- **Client:** Amount &gt; 0, destination format, exchange rate present, limits (refetched before submit), button disabled when invalid.
- **Server:** `validateExchangeRequest()` (required fields, amounts, asset IDs, destination format); then NOWPayments min/max; asset IDs must exist in supported list.

### 3.4 What Is Saved to the Database

- **When:** In the same request, after `createPayment()` succeeds.  
- **Where:** Table **`orders`** (and one row in **`order_status_history`**) via RPC **`create_order_with_history`**.  
- **Key fields:** `user_id` (or null), `order_id` (client-generated), `payment_id` (NOWPayments), `internal_status` = 'NEW', `user_status` (derived), `from_currency` / `from_amount` / `from_network` / `from_address` (deposit), `to_currency` / `to_amount` / `to_network` / `to_address` (payout), `payment_mode`, timestamps, etc.

### 3.5 Response and UI After

- **Response:** JSON with `pay_address`, `payment_id`, and exchange metadata.  
- **UI:** Redirect to **`/order/[id]`** where `id` is the **client-generated order_id**. That page polls **`GET /api/order/[id]`** (source of truth: DB only) and shows deposit address, QR, and progress.

---

## 4. DATA STORAGE & TIMING

### 4.1 When Data Is Saved

| Event | When | What |
|-------|------|-----|
| Order created | Right after NOWPayments `createPayment()` succeeds in `POST /api/payment` | One row in `orders` + one in `order_status_history` (RPC `create_order_with_history`) |
| Status / payment update | When NOWPayments sends IPN to `/api/webhook/nowpayments` | Idempotency row (if new) + `orders` update + `order_status_history` row (RPC `process_webhook_status_update`) |
| Admin action (status, lock, payout hash, etc.) | When admin submits action in order detail | `orders` update (and sometimes `order_status_history`), ledger on completion, optional notification |

### 4.2 Tables Used (Relevant Subset)

| Table | Role |
|-------|------|
| **orders** | Single source for order + payment: order_id, payment_id, user_id, internal_status, user_status, provider_status, from_*/to_* (currency, amount, network, address), payin_hash, payout_hash, manual_review fields, timestamps, etc. |
| **order_status_history** | Append-only log of status changes (order_id, status, source, payment_status, metadata). |
| **webhook_idempotency** | (payment_id, payment_status, order_id) to avoid processing the same IPN twice. |
| **admin_notes** | Admin notes linked to order_id. |
| **admin_action_logs** | Audit log for admin actions. |
| **ledger_entries** | Used when order is completed (e.g. recordOrderCompletion). |

There is **no** separate `payments` or `transactions` table; “payment” is the row in `orders` identified by `payment_id`.

### 4.3 Order vs Payment vs Transaction

- **Order:** One row in `orders`. Represents one exchange (or payment) request. Has `order_id` (app-level) and `payment_id` (NOWPayments).
- **Payment:** In this codebase, “payment” is the same row—the NOWPayments payment is identified by `payment_id` and linked 1:1 to the order. Admin “Payments” page is a **view over orders** where `payment_id` is not null (and optionally filtered by status).
- **Transaction:** No first-class “transaction” entity. “Transaction” in UI copy (e.g. “Recent Transactions”) can mean either the order row or external blockchain tx; hashes are stored as `payin_hash` / `payout_hash` on the order.

### 4.4 Mandatory vs Optional (Orders)

- **Mandatory (for creation):** `order_id`, `from_currency`, `from_amount`, `to_currency`, `to_amount`, `internal_status` (default NEW). After payment creation: `payment_id` is set.
- **Nullable/optional:** `user_id`, `payment_id`, `from_network`, `from_address`, `to_network`, `to_address`, `provider_status`, `payin_hash`, `payout_hash`, `expires_at`, manual review fields, etc. Schema in `000_final_schema.sql` and migrations (e.g. `039_allow_null_user_id_in_orders.sql`) define nullability.

### 4.5 Status Lifecycle

**Internal status (admin / system):**  
NEW → AWAITING_DEPOSIT → CONFIRMING → PAYMENT_CONFIRMED → (PROCESSING_BY_PROVIDER | MANUAL_REVIEW) → DONE | FAILED | EXPIRED  

**User-facing labels** (from `lib/status-mapping.ts` – `getUserFacingStatus()`):

- NEW, AWAITING_DEPOSIT → “Waiting for payment”
- CONFIRMING → “Waiting for confirmation”
- PAYMENT_CONFIRMED → “Payment confirmed”
- PROCESSING_BY_PROVIDER, MANUAL_REVIEW → “Processing”
- DONE → “Completed”
- FAILED → “Failed”
- EXPIRED → “Expired”

**Provider (NOWPayments) → internal** (in webhook): `lib/status-mapping.ts` – `mapProviderStatusToInternal()` (e.g. waiting → AWAITING_DEPOSIT, confirming → CONFIRMING, confirmed → PAYMENT_CONFIRMED, finished/success → DONE, failed/expired → FAILED/EXPIRED).  

**Transition rules:** `lib/order-state.ts` – `canTransition()`. Webhook updates are **authoritative** and bypass this; admin and system updates enforce the state machine. Manual payout mode can prevent auto-DONE and leave order in PAYMENT_CONFIRMED or MANUAL_REVIEW until admin completes it.

---

## 5. DASHBOARD BREAKDOWN (User)

- **What it shows:** List of the logged-in user’s orders: order ID, date, status, from/to amounts and currencies, “View Details” link to `/order/[orderId]`. Optional status filter and pagination.
- **Data:** `GET /api/account/orders?status=...&limit=25&offset=...` → implemented via `getUserOrders(authUser.userId, { status, limit, offset })` in `lib/db-orders.ts` (filters by `status` column when provided).
- **Refresh:** No automatic refresh; user changes filter or page to trigger a new request.

**Note:** Filter options are “pending” / “completed” / “failed”, but DB stores `internal_status` (e.g. NEW, DONE, FAILED) and a legacy `status` column kept in sync with it. `getUserOrders` filters by `status`. If the app only ever writes internal_status values (e.g. 'NEW') into `status`, then filtering by “pending” may not match any rows—potential mismatch to fix (e.g. filter by `user_status` or map filter values to `internal_status`).

---

## 6. ADMIN PAGES: ORDERS vs PAYMENTS

### 6.1 `/admin/orders`

- **Purpose:** Manage **orders**: list, filter, open review queue, open order detail.
- **Data:** Server-side in `app/admin/orders/page.tsx` – `getOrders(searchParams)` queries **`orders`** with Supabase: optional filters by `internal_status`, `order_id`, `payment_id`, `showUnpaid`, `showAnonymous`, `reviewQueue`. Default view excludes anonymous and focuses on non-NEW/non-AWAITING_DEPOSIT unless “show unpaid” or “review queue” is used. Returns list of orders (id, order_id, payment_id, status, internal_status, user_status, provider_status, from_*/to_*, created_at, updated_at, locked).
- **Difference from payments:** Orders page is the full order list with filters and review queue; each row is one order.
- **How rows are created:** Each row is created when a user (or API) creates an exchange/payment via `POST /api/payment` and `createOrderWithHistoryTransaction()`.
- **Actions:** From the table you go to **`/admin/orders/[id]`**. There, **OrderDetailPanel** and related UI call **`POST /api/admin/orders/[id]/actions`** with action types: `lock`, `unlock`, `verify_payment` (read-only), `resync`, `mark_failed`, `approve_manual_payout`, `enter_payout_hash`, `mark_completed`. Backend in `app/api/admin/orders/[id]/actions/route.ts`: enforces role (`requireAdminRole('operator')`), maintenance mode, locked state (except super_admin), and state rules (e.g. DONE cannot be marked failed, EXPIRED cannot resync); then updates `orders` (and optionally history), ledger, and notifications.

### 6.2 `/admin/payments`

- **Purpose:** View “payments” as a list (orders that have a payment_id and optionally only “paid” statuses).
- **Data:** Server-side in `app/admin/payments/page.tsx` – `getPayments(filter)` queries **same `orders`** table where `payment_id` is not null; if filter is `'paid'`, restricts to status in `['CONFIRMING', 'PAYMENT_CONFIRMED', 'PROCESSING_BY_PROVIDER', 'MANUAL_REVIEW', 'DONE']`. Returns a list of payment-like objects (payment_id, order_id, status, internal_status, user_status, provider_status, from_*/to_*, created_at, updated_at).
- **Difference from orders:** Payments page is a **view** over orders with payment_id; emphasis on “paid” vs “all” and payment-centric columns. No separate payments table.
- **How rows are created:** Same as orders—each payment row is created when an order is created via `POST /api/payment`.
- **Actions:** Table uses **PaymentsTable** which can call:
  - **Verify:** `POST /api/admin/orders/[orderId]/actions` with `action: 'verify_payment'` (read-only comparison with provider).
  - **Flag:** `POST /api/admin/payments/[paymentId]/flag` (stores a flag/reason; implementation in `app/api/admin/payments/[id]/flag/route.ts`).

---

## 7. RELATIONSHIP MAPPING

- **Users ↔ orders:** `orders.user_id` → `users.id`. Nullable for anonymous orders.
- **Orders ↔ “payments”:** 1:1. Same row: `orders.payment_id` is the NOWPayments payment ID.
- **Crypto selections ↔ pricing and rates:**  
  - **Rates (UI):** From CoinGecko (hook) and fee (e.g. fixed 1% / float 0.5%) in `ExchangeWidget`; rate = sendPrice/receivePrice, then fee applied to get `expected_receive`.  
  - **Limits:** NOWPayments API (and optional DB cache) by send/receive asset ID and fixed/float.  
  - **Asset IDs:** From `supported-cryptos.ts` / `supportedAssets.ts`; same IDs used for UI, validation, and NOWPayments.
- **IDs:**  
  - **order_id:** App-generated (e.g. random string from widget), unique in `orders`.  
  - **payment_id:** From NOWPayments, stored in `orders`.  
  - **id:** UUID primary key of the row in `orders`.  
  Order and “payment” are the same row; no ID reuse—order_id and payment_id are different concepts (one app, one provider).

---

## 8. FILE-LEVEL TRACEABILITY (Concise)

| Topic | Files |
|-------|--------|
| Exchange widget (flow, “Exchange Now”) | `components/ExchangeWidget.tsx` |
| Create payment + order (API) | `app/api/payment/route.ts` |
| Validation (exchange/payment body, address) | `lib/validation.ts` |
| NOWPayments createPayment / getPaymentStatus / getExchangeLimits | `lib/nowpayments.ts` |
| Order DB create (single and with history) | `lib/db-orders.ts` (`createOrder`, `createOrderWithHistoryTransaction`) |
| Order RPC (create with history) | `supabase/migrations/041_create_order_with_history_rpc.sql` |
| Webhook handler | `app/api/webhook/nowpayments/route.ts` |
| Webhook atomic update (idempotency + order + history) | `lib/db-orders.ts` (`processWebhookStatusUpdateAtomic`), `supabase/migrations/042_process_webhook_atomic_rpc.sql` |
| Status mapping (internal ↔ user ↔ provider) | `lib/status-mapping.ts` |
| Order state machine (transitions) | `lib/order-state.ts` |
| Get order by id (user/anon) | `app/api/order/[id]/route.ts`, `lib/db-orders.ts` (`getOrderByOrderId`) |
| User orders list | `app/api/account/orders/route.ts`, `lib/db-orders.ts` (`getUserOrders`) |
| Exchange limits API | `app/api/exchange/limits/route.ts`, `lib/nowpayments.ts`, `lib/db-exchange-limits.ts` |
| Admin orders list | `app/admin/orders/page.tsx`, `components/admin/OrdersTable.tsx` |
| Admin payments list | `app/admin/payments/page.tsx`, `components/admin/PaymentsTable.tsx` |
| Admin order actions | `app/api/admin/orders/[id]/actions/route.ts`, `components/admin/OrderDetailPanel.tsx` (or equivalent) |
| Orders table schema | `supabase/migrations/000_final_schema.sql`, `028_rebuild_order_status_system.sql`, `039_allow_null_user_id_in_orders.sql` |

---

## 9. ASSUMPTIONS & GAPS

- **User dashboard filter:** Filter uses `status` with values like “pending”/“completed”/“failed”, while DB stores `internal_status` (e.g. NEW, DONE, FAILED). If `status` is always set from `internal_status`, filter “pending” may never match. **Recommendation:** Filter by `user_status` or map filter values to `internal_status` in `getUserOrders`.
- **Recent Transactions on home:** Uses mock/fake data inside the component, not real orders. If “recent” should reflect real completed orders, it should call an API (e.g. recent completed orders or a dedicated endpoint).
- **order_id in widget:** The redirect after “Exchange Now” uses a client-generated `order_id`. The same value must be sent in the payload as `order_id` so the backend stores it and the order page can load it via `GET /api/order/[id]`. Currently consistent; any change to how order_id is generated must keep this in sync.
- **PUBLIC_BASE_URL:** Must be set and not localhost for production so the webhook URL is reachable by NOWPayments.
- **Manual payout mode:** When enabled, webhook does not set status to DONE when provider says “finished”; order stays in PAYMENT_CONFIRMED or MANUAL_REVIEW until admin uses “mark completed” or similar. Admin actions respect this.
- **No Server Actions:** All order/payment flows use API routes; no Next.js Server Actions for this flow.
- **No separate payments table:** “Payments” everywhere are orders with `payment_id` set; any reporting or analytics on “payments” should query `orders` with the appropriate filters.

---

This audit should be enough to maintain, debug, and extend the MintMove exchange flow with full traceability from UI to DB and external APIs.
