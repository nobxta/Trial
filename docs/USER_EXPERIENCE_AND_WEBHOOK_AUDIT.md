# User Experience & Webhook Mechanism – Audit

This document is a **reverse-engineering audit** of the user-side experience and the webhook-driven state machine. It answers: how the user is notified, how the order page tracks progress, how the webhook works, how expiry is handled, and how admin vs webhook authority is enforced.

---

## 1. USER NOTIFICATION & ORDER CREATION

### 1.1 When the user clicks “Exchange Now” and an order is created

**Immediate user feedback:**

- **No toast.** There is no toast or snackbar on success or failure.
- **Redirect.** On success, the frontend performs a client-side redirect to **`/order/[orderId]`** where `orderId` is the **client-generated** value (e.g. `Math.random().toString(36).substring(2, 8).toUpperCase()` from `ExchangeWidget`).
- **UI state.** The button shows “Creating Order...” and is disabled while the request is in flight; on success the component unmounts due to redirect. On error, `orderError` is set and an `ErrorMessage` banner is shown; the user stays on the home page.
- **Stored data.** On success, the frontend writes to **localStorage** under key **`order_${orderId}`** with a JSON object that includes the API response plus widget state (send/receive amounts, symbols, destination, orderType, exchangeRate). The **order page does not read this key** for display; it uses only the API. So this is for debugging or future use, not for “first visible” data.

**Code:**  
`components/ExchangeWidget.tsx` – button `onClick` (approx. lines 664–758): on successful `POST /api/payment` response with `paymentData.pay_address`, it builds `orderData`, does `localStorage.setItem(\`order_${orderId}\`, JSON.stringify(orderData))`, then `router.push(\`/order/${orderId}\`)`.

### 1.2 What the user sees on the order page at first load

- **Route:** `app/order/[id]/page.tsx`.
- **Data source:** **`GET /api/order/[id]`** only. No use of localStorage for displayed order data.
- **First request:** As soon as the order page mounts, it calls `fetch(\`/api/order/${orderId}\`)`. Until that returns, `loading === true` and the user sees “Loading order...” (no order details).
- **After first response:** If the order exists, the page renders:
  - **OrderSummary:** send/receive amounts and symbols (from API: `payAmount`, `payCurrency`, `outcomeAmount`, `outcomeCurrency`).
  - **OrderDetails:** `orderId`, deposit amount/symbol, **deposit address** (`payAddress` from API `fromAddress`), “Fixed rate”, confirmations (hardcoded 1), **time remaining** (see §4), created date, **isExpired** (see §4), `internalStatus`.
  - **QRCodeSection:** deposit address and amount for QR; disabled if expired.
  - **ProgressTimeline:** step derived from **`internalStatus`** (see §8).
  - “Checking payment status...” when `isSyncing && !finalStatus`.

**File:** `app/order/[id]/page.tsx` – `fetchOrder()` calls `GET /api/order/${orderId}`; response is mapped into local `Order` state and drives all of the above.

### 1.3 First visible status and where it comes from

- **Source of truth:** Database only. **`GET /api/order/[id]`** (`app/api/order/[id]/route.ts`) calls **`getOrderByOrderId(orderId)`** and returns **`order.userStatus`** as `status` and **`order.internalStatus`** as `internalStatus`.
- **For a newly created order:** The payment route creates the order with **`internalStatus: 'NEW'`**. **`user_status`** is set by **`getUserFacingStatus('NEW')`** in **`lib/status-mapping.ts`** → **“Waiting for payment”**.
- So the **first visible status** to the user is **“Waiting for payment”**, from the DB field **`user_status`**, which is derived from **`internal_status`** at order creation and on every status update.

**Files:**  
`app/api/order/[id]/route.ts` (returns `order.userStatus` as `status`); `lib/status-mapping.ts` (`getUserFacingStatus`); `lib/db-orders.ts` (`createOrderWithHistoryTransaction` / RPC set `user_status`).

---

## 2. ORDER TRACKING (USER SIDE)

### 2.1 How the order page tracks progress

- **Single source of truth:** The order page keeps **one** state object for the order, updated only from **`GET /api/order/[id]`**.
- **No direct NOWPayments calls.** The frontend never talks to NOWPayments; it only calls **`/api/order/[id]`**, which reads from the **database** only.

**File:** `app/order/[id]/page.tsx` – `fetchOrder()` and the effect that sets up polling.

### 2.2 Polling

- **Endpoint:** **`GET /api/order/[id]`** (e.g. `GET /api/order/ABC123`).
- **Frequency:** **Every 3 seconds.** Implemented with `setInterval(fetchOrder, 3000)` in a `useEffect` that runs when `orderId` is set.
- **Additional trigger:** On **tab visibility** `visible`, `fetchOrder()` is called once (so when the user comes back to the tab they get a fresh fetch).
- **Stop condition:** When **`internalStatus`** is one of **`DONE`**, **`FAILED`**, **`EXPIRED`**, the interval is cleared and polling stops.

**File:** `app/order/[id]/page.tsx` – `useEffect` with `fetchOrder()` and `setInterval(fetchOrder, 3000)`; inside `fetchOrder`, after setting state, if `finalStatuses.includes(orderData.internalStatus)` then `clearInterval(pollIntervalRef.current)`.

### 2.3 Source of truth

- **Backend:** **Database (`orders` table)** is the only source of truth. **`GET /api/order/[id]`** uses **`getOrderByOrderId(orderId)`** and does **not** call NOWPayments.
- **Frontend:** Every poll overwrites local order state with the API response (no “skip if unchanged” logic). So the user’s view is always whatever the DB last had; updates appear within at most one polling interval (3 seconds) after a webhook or admin action writes to the DB.

**Files:** `app/api/order/[id]/route.ts` (read from DB only); `app/order/[id]/page.tsx` (always `setOrder(orderData)` from API).

---

## 3. WEBHOOK SYSTEM

### 3.1 Webhook URL

- **Path:** **`POST /api/webhook/nowpayments`** (path only; host is the app’s public base URL).
- **Full URL:** **`{PUBLIC_BASE_URL}/api/webhook/nowpayments`**.
- **Where it’s defined:** It is **built in code** in **`app/api/payment/route.ts`**:
  - `const publicBaseUrl = getPublicBaseUrl();`
  - `const ipnCallbackUrl = \`${publicBaseUrl}/api/webhook/nowpayments\`;`
  - `paymentParams.ipn_callback_url = ipnCallbackUrl;`
- **Base URL:** **`lib/env.ts`** – **`getPublicBaseUrl()`** returns `process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'` (or from config cache). The payment route also asserts that in production this must not be localhost.

**Files:** `app/api/payment/route.ts` (lines ~113–132 for exchange, ~244–262 for payment); `lib/env.ts` (`getPublicBaseUrl`).

### 3.2 How the URL is passed to NOWPayments

- **When:** During **payment creation** in **`POST /api/payment`**. After building `paymentParams`, the route calls **`createPayment(paymentParams)`** (**`lib/nowpayments.ts`**).
- **In nowpayments.ts:** The payload sent to NOWPayments includes `ipn_callback_url` if provided. So the URL is sent **once per payment** in the create-payment request; NOWPayments then uses it for IPN (webhook) callbacks for that payment.

**Files:** `app/api/payment/route.ts`; `lib/nowpayments.ts` (`createPayment`, payload includes `ipn_callback_url`).

### 3.3 Webhook events expected

The handler does **not** branch on event type; it reads **`payload.payment_status`** and maps it to an internal status. The **provider statuses** that are explicitly mapped in **`lib/status-mapping.ts`** in **`mapProviderStatusToInternal()`** are:

- **waiting** → AWAITING_DEPOSIT  
- **confirming** → CONFIRMING  
- **confirmed** → PAYMENT_CONFIRMED  
- **sending** → PROCESSING_BY_PROVIDER  
- **partially_paid** → PAYMENT_CONFIRMED  
- **finished** → DONE  
- **success** → DONE  
- **failed** → FAILED  
- **expired** → EXPIRED  
- **refunded** → EXPIRED  

Any other value maps to **NEW**.

**File:** `lib/status-mapping.ts` – `mapProviderStatusToInternal()`.

### 3.4 How the webhook handler works

**Entry:** **`app/api/webhook/nowpayments/route.ts`** – **`POST`** handler.

1. **Validate request**
   - **Raw body:** `await request.text()` for signature verification.
   - **JSON:** `JSON.parse(rawBody)`; require **`payload.payment_id`** and **`payload.payment_status`** (400 if missing).
   - **Signature:** Header **`x-nowpayments-sig`** (or **`x-nowpayments-signature`** or **`signature`**). Secret is chosen by **payment mode** (live vs sandbox): order is loaded by **`getOrderByPaymentId(paymentId)`** to get **`order.paymentMode`**; then **`getNowPaymentsLiveIpnSecret()`** or **`getNowPaymentsSandboxIpnSecret()`** from **`lib/env.ts`**. **`verifyWebhookSignature(rawBody, signature, secret)`** (same file) uses HMAC SHA-512 (128 hex chars); invalid or missing signature → 401. In production, missing secret → 500.

2. **Idempotency**
   - Handled **inside** **`processWebhookStatusUpdateAtomic()`** (**`lib/db-orders.ts`**), which calls Supabase RPC **`process_webhook_status_update`** (**`supabase/migrations/042_process_webhook_atomic_rpc.sql`**).
   - The RPC first **INSERT**s into **`webhook_idempotency`** with **`(payment_id, payment_status, order_id)`**. **`ON CONFLICT (payment_id, payment_status) DO NOTHING`**; if the INSERT returns no row, the RPC returns **`already_processed: true`** and does **not** update the order or history.
   - So **idempotency key** is **(payment_id, payment_status)**. The same event from NOWPayments can be processed only once.

3. **Map provider status → internal status**
   - **`mapProviderStatusToInternal(payload.payment_status)`** (**`lib/status-mapping.ts`**) → internal status.
   - **Manual payout mode:** If **`getPayoutMode()`** is **`'manual'`** and the mapped status would be **DONE** (or provider status is **finished/success**), the webhook **overrides** to **PAYMENT_CONFIRMED** or **MANUAL_REVIEW** so the order does not auto-complete; admin must use “mark completed” or similar.

4. **Update order and append history**
   - **`processWebhookStatusUpdateAtomic({ paymentId, paymentStatus, orderId, internalStatus, userStatus, providerStatus, statusSource: 'webhook', fromAddress, payinHash, payoutHash })`**. This runs the same RPC:
     - After idempotency INSERT, the RPC **UPDATE**s **`orders`** for **`order_id`**: sets **internal_status**, **user_status**, **status** (legacy), **status_source = 'webhook'**, **provider_status**, **from_address**, **payin_hash**, **payout_hash**, **updated_at** (and optionally **payout_hash_entered_at** if payout_hash set).
     - If **internal_status** changed, the RPC **INSERT**s into **`order_status_history`** one row: **order_id**, **status** (new internal_status), **source = 'webhook'**, **payment_status**, **metadata** (payin_hash, payout_hash).
   - So: **one** RPC does idempotency + order update + history; all in one transaction (rollback on any failure).

**Files:**  
`app/api/webhook/nowpayments/route.ts` (validation, signature, lookup order, manual override, call `processWebhookStatusUpdateAtomic`); `lib/db-orders.ts` (`processWebhookStatusUpdateAtomic`); `lib/status-mapping.ts` (`mapProviderStatusToInternal`, `getUserFacingStatus`); `supabase/migrations/042_process_webhook_atomic_rpc.sql` (RPC body).

---

## 4. TIMEOUT & EXPIRY LOGIC

### 4.1 “Not paid in time” handling

- **Backend:** The app does **not** set an order to EXPIRED based on a stored “expires at” timestamp in the DB. The **`orders`** table in **`000_final_schema.sql`** and the **`create_order_with_history`** RPC (**041**) do **not** include an **`expires_at`** column. So **expiry of “payment window” is not stored in the database**.
- **Who sets EXPIRED:**
  - **Webhook:** When NOWPayments sends **`payment_status: 'expired'`**, **`mapProviderStatusToInternal('expired')`** → **EXPIRED**; the webhook then updates the order to **EXPIRED** via **`processWebhookStatusUpdateAtomic`**. So “not paid in time” is **driven by NOWPayments** sending an **expired** IPN when their side considers the payment window closed.
  - **Cron (reconcile):** **`app/api/cron/reconcile-orders/route.ts`** calls **`runOrderReconciliation()`** (**`lib/order-reconciliation.ts`**). That finds orders in **NEW** or **CONFIRMING** older than 15 minutes, fetches **`getPaymentStatus(paymentId)`** from NOWPayments, maps **provider_status** to internal (including **expired** → EXPIRED), and calls **`processWebhookStatusUpdateAtomic`** with **statusSource: 'polling'**. So if NOWPayments has already marked the payment expired, the cron will sync that to the DB. The app does **not** independently decide “15 minutes passed → set EXPIRED” without provider status.

**Implication:** If NOWPayments never sends **expired** (e.g. they don’t expire payments, or their IPN is delayed/lost), the order can stay **NEW** or **CONFIRMING** indefinitely even after the frontend countdown reaches zero.

### 4.2 Where expiration time is stored

- **Database:** **No `expires_at` (or equivalent) on `orders`.** The API returns **`order.expiresAt`** (**`app/api/order/[id]/route.ts`** reads **`order.expiresAt || null`** from **`getOrderByOrderId`** → **`mapOrderRow`** which reads **`row.expires_at`**). Since the column does not exist in the schema used for creation, this is **null** for orders created by the current flow.
- **Frontend “expiry”:** The order page computes a **countdown** from **created_at** using a **hardcoded 15 minutes** (**`defaultTimeLimit = 15 * 60`**). So “time remaining” is **purely client-side** from **createdAt**; it is **not** backed by a stored expiration time in the DB.

**Files:**  
`app/order/[id]/page.tsx` (defaultTimeLimit, timeRemaining from createdAt); `lib/db-orders.ts` (`mapOrderRow` → `expiresAt`); `supabase/migrations/000_final_schema.sql` (orders table has no expires_at); `supabase/migrations/041_create_order_with_history_rpc.sql` (no expires_at in INSERT).

### 4.3 When time starts, runs low, and expires (user view)

- **Time starts:** As soon as the order page has **createdAt** from the API, it computes **elapsed** from **createdAt** to now and **timeRemaining = max(0, defaultTimeLimit - elapsed)**. So the countdown effectively starts at **order creation** (backend **created_at**).
- **Running low:** **OrderDetails** receives **timeRemaining** and **isExpired**; it shows a countdown (e.g. “14:32”) and decrements it every second with **setInterval**. No server interaction for the countdown.
- **When countdown hits 0:**  
  **isExpired** on the order page is:  
  **`order.internalStatus === 'EXPIRED' || !!(order.expiresAt && new Date(order.expiresAt) < new Date())`**.  
  Since **expiresAt** is null, **isExpired** becomes true only when **internalStatus === 'EXPIRED'**. So when the **frontend** countdown reaches 0:
  - The UI can show **“Time Remaining 0:00”** (because **timeRemaining** is 0).
  - The **status** and “Expired” badge depend on **internalStatus**. Until the backend sets **internalStatus** to **EXPIRED** (webhook or cron), the user still sees status “Waiting for payment” (or “Waiting for confirmation”) and may not see the “Expired” state in **OrderDetails** / **ProgressTimeline**.

So: **expiry display** is a mix of (1) frontend countdown from **created_at** (cosmetic) and (2) backend **internal_status === 'EXPIRED'** (authoritative “Expired” state and messaging).

**Files:**  
`app/order/[id]/page.tsx` (isExpired, timeRemaining, defaultTimeLimit); `components/OrderDetails.tsx` (countdown interval, “Expired” when isExpired); `components/ProgressTimeline.tsx` (isExpired for styling).

### 4.4 What drives expiry

- **Webhook:** NOWPayments sends **payment_status: 'expired'** → handler maps to **EXPIRED** and updates order. **Primary** way the app marks an order expired.
- **Cron:** Reconcile runs periodically (e.g. every 15–20 min per **vercel.json**); it pulls provider status and can set **EXPIRED** if the provider reports **expired**. **Recovery** when webhook was missed or delayed.
- **Frontend timer:** Only updates the **countdown** and “Time Remaining 0:00”. It does **not** call an API to set status to EXPIRED.
- **Database:** No cron or trigger that sets **EXPIRED** based on **expires_at**; there is no **expires_at** on orders.

### 4.5 Status when time runs out (user-visible)

- **When only the frontend countdown has reached 0:** User still sees **status** from API (e.g. “Waiting for payment”) until **internalStatus** becomes **EXPIRED**. So they may see “0:00” but not yet “Expired”.
- **When backend has set internal_status to EXPIRED:**  
  **getUserFacingStatus('EXPIRED')** → **“Expired”**. The order page shows:
  - **OrderDetails:** “Status” badge “Expired” and the red “Payment Window Expired” / “This payment window has expired. Please create a new order to continue.”
  - **ProgressTimeline:** First step in error style (red, X icon); **isExpired** true.
  - **QRCodeSection:** Treated as expired (e.g. no QR or disabled).

**Files:**  
`lib/status-mapping.ts` (`getUserFacingStatus('EXPIRED')` → “Expired”); `app/order/[id]/page.tsx`; `components/OrderDetails.tsx`; `components/ProgressTimeline.tsx`.

---

## 5. BLOCKCHAIN CONFIRMATION FLOW

### 5.1 After deposit address is shown

- User is shown **deposit address** and amount (and QR). When they **send funds**:
  - The app does **not** monitor the blockchain. **NOWPayments** detects the transaction and confirmations and sends **IPN** events with **payment_status** (e.g. **waiting** → **confirming** → **confirmed** → **sending** → **finished**).
  - So “transaction exists” and “waiting for confirmations” are **entirely represented by NOWPayments’ status** and our mapping; there is no separate on-chain check in this codebase.

### 5.2 How “seen on blockchain but waiting confirmations” is represented

- **Provider status:** **confirming** = seen but not fully confirmed.
- **Internal status:** **CONFIRMING**.
- **User status:** **“Waiting for confirmation”** (**getUserFacingStatus('CONFIRMING')**).
- **UI timeline:** **getStepFromInternalStatus('CONFIRMING')** → **step 1** → label **“Waiting for confirmation”** in **ProgressTimeline** (**components/ProgressTimeline.tsx**).

So: **detected** ≈ AWAITING_DEPOSIT / CONFIRMING (depending on provider); **confirming** = CONFIRMING; **fully confirmed** = PAYMENT_CONFIRMED (and later PROCESSING_BY_PROVIDER → DONE).

**Files:**  
`lib/status-mapping.ts` (`mapProviderStatusToInternal`, `getUserFacingStatus`, `getCurrentStep`); `app/order/[id]/page.tsx` (`getStepFromInternalStatus`); `components/ProgressTimeline.tsx` (steps 0–4 labels).

### 5.3 Where this is reflected in the UI timeline

- **Order page** gets **internalStatus** from **GET /api/order/[id]** and passes **timelineStep = getStepFromInternalStatus(order.internalStatus)** to **ProgressTimeline**.
- **ProgressTimeline** steps (in code):  
  0 = Waiting for payment, 1 = Waiting for confirmation, 2 = Payment confirmed, 3 = Processing, 4 = Completed.  
  **getStepFromInternalStatus** in the page mirrors this (NEW/AWAITING_DEPOSIT → 0, CONFIRMING → 1, PAYMENT_CONFIRMED → 2, PROCESSING_BY_PROVIDER/MANUAL_REVIEW → 3, DONE → 4, FAILED/EXPIRED → 0 with error styling).

**Files:**  
`app/order/[id]/page.tsx` (`getStepFromInternalStatus`, `timelineStep`); `components/ProgressTimeline.tsx` (steps array and currentStep).

---

## 6. ADMIN INTERVENTION EFFECT ON USER

### 6.1 Admin actions and DB changes

Admin actions are handled in **`app/api/admin/orders/[id]/actions/route.ts`** (**POST** with **action**, optional **reason**, **payoutHash**). Summary:

- **verify_payment:** Read-only. Fetches **getPaymentStatus(paymentId)** from NOWPayments and returns comparison (provider vs DB). **No DB write.** User sees nothing from this.
- **lock / unlock:** **UPDATE orders SET locked = true | false** for that **order_id**. No status change. User does not see “locked” on the order page (it’s for admin protection against other admin actions).
- **resync:** Fetches **getPaymentStatus(paymentId)**; maps provider status to internal (with manual-payout override); calls **updateOrderStatus(orderId, finalStatus, { providerStatus }, { source: 'admin', updatedBy: adminId })**. So **internal_status**, **user_status**, **status**, **status_source = 'admin'**, **provider_status**, **updated_at** are updated. User sees the new status on next poll.
- **mark_failed:** **updateOrderStatus(orderId, 'FAILED', undefined, { source: 'admin', updatedBy: adminId })**. Same fields updated. **notifyOrderStatus** is called so user can get email/notification.
- **approve_manual_payout:** **UPDATE orders** sets **internal_status = 'MANUAL_REVIEW'**, **manual_review_required**, **manual_review_assigned_to**, etc.; then **updateOrderStatus(..., 'MANUAL_REVIEW', ...)** so **user_status** etc. are consistent. User sees “Processing” (MANUAL_REVIEW maps to that).
- **enter_payout_hash:** **UPDATE orders** sets **payout_hash**, **payout_hash_entered_by**, **payout_hash_entered_at**. No status change. User sees payout hash on next poll if the API exposes it.
- **mark_completed:** **updateOrderStatus(orderId, 'DONE', ...)** with **source: 'admin'**. Ledger and **notifyOrderStatus** are called. User sees “Completed” on next poll.

**File:** `app/api/admin/orders/[id]/actions/route.ts`.

### 6.2 How the user sees the change

- **Polling:** Order page polls **GET /api/order/[id]** every **3 seconds**. After an admin action, the next successful poll returns the updated order (including **internalStatus**, **status** = userStatus). So the user sees the change **within one poll interval** (up to ~3 seconds) without refreshing the page.
- **No push.** There is no WebSocket or server-sent event; only polling.

**File:** `app/order/[id]/page.tsx` (polling interval 3000 ms).

### 6.3 Which admin actions bypass webhook logic

- **None** of the admin actions “bypass” the webhook in the sense of disabling it. Webhooks can still arrive and, per §7, **webhook is authoritative**: a webhook update will overwrite **status_source** and status even if an admin previously set them (except when the order is already in a final state and the webhook doesn’t change it).
- **mark_completed**, **mark_failed**, **resync**, **approve_manual_payout**, **enter_payout_hash** all go through **updateOrderStatus** or direct **UPDATE**; they do **not** call **processWebhookStatusUpdateAtomic**. So they are “admin path” updates; the **next** webhook from NOWPayments for that payment will still be processed (idempotency by (payment_id, payment_status)) and can overwrite status if the webhook carries a different status.

---

## 7. WEBHOOK VS ADMIN AUTHORITY

### 7.1 Which is authoritative when both can apply

- **Webhook is authoritative.** The code explicitly treats webhook updates as overriding other sources. Non-webhook updates (admin, system, polling) are subject to the state machine and “admin decision” protection; webhook updates skip that.

**File:** `lib/db-orders.ts` – **updateOrderStatus** (used by admin actions and others; **not** used by the webhook for the atomic path). The webhook uses **processWebhookStatusUpdateAtomic** (RPC), which does a direct UPDATE without calling **updateOrderStatus**. The authority rule is implemented in **updateOrderStatus**:

- **isWebhookUpdate = (options?.source === 'webhook')**.  
  If **true**, the function **skips** all validation (state machine and “admin decision” protection) and proceeds to update.  
  But the webhook handler **never** calls **updateOrderStatus**; it only calls **processWebhookStatusUpdateAtomic**. So the “webhook is authoritative” behavior is: (1) webhook updates go through a **separate path** (RPC) that does **not** check state machine or admin protection; (2) **updateOrderStatus** is written so that **if** it were used with **source: 'webhook'**, it would bypass those checks. So in practice, **every** webhook update is applied without transition or admin checks; **admin updates** go through **updateOrderStatus** and **are** checked (admin protection and state machine).

### 7.2 Can webhook override an admin-set status?

- **Yes.** The webhook path (RPC **process_webhook_status_update**) does **not** read **status_source** or “admin decision”; it just updates **internal_status**, **user_status**, **status**, **status_source = 'webhook'**, etc. So a later webhook from NOWPayments (e.g. **confirmed** or **finished**) will overwrite the order status even if an admin had set it to something else (e.g. FAILED or MANUAL_REVIEW).

**File:** `supabase/migrations/042_process_webhook_atomic_rpc.sql` – UPDATE has no condition on **status_source** or **status_updated_by**.

### 7.3 Can admin override a webhook status?

- **Yes.** Admin calls **updateOrderStatus** with **source: 'admin'**. That writes **internal_status**, **user_status**, **status_source = 'admin'**, etc. The **next** webhook for the **same (payment_id, payment_status)** is **idempotent** (no duplicate row in **webhook_idempotency**), so it won’t apply again. A webhook with a **new** **payment_status** (e.g. later event like **finished**) will insert a new idempotency row and run the RPC again, and then the webhook **will** override the admin-set status. So: admin can override until NOWPayments sends a **new** status event; then webhook wins again.

### 7.4 Where this is enforced in code

- **Webhook path:** **`app/api/webhook/nowpayments/route.ts`** → **processWebhookStatusUpdateAtomic** → RPC **process_webhook_status_update**. RPC has no check for **status_source** or admin; it always applies the incoming status.
- **Admin path:** **`app/api/admin/orders/[id]/actions/route.ts`** → **updateOrderStatus(..., { source: 'admin', updatedBy: adminId })**.  
- **updateOrderStatus** in **`lib/db-orders.ts`**:
  - If **options?.source === 'webhook'** → skip all validation (lines ~558–563).
  - Else: if **status_source === 'admin'** and not a final state → block update (return current order) so **only admin** can change it until a final state (lines ~568–590).  
  So: **admin protection** is only in **updateOrderStatus**; the webhook RPC does not use **updateOrderStatus**, so webhook is never blocked by admin.

**Files:**  
`lib/db-orders.ts` (`updateOrderStatus`: isWebhookUpdate bypass, isAdminDecision block); `app/api/webhook/nowpayments/route.ts`; `supabase/migrations/042_process_webhook_atomic_rpc.sql`.

---

## 8. ORDER PAGE RENDERING

### 8.1 How the order page decides message, progress step, and warnings

- **Message / status text:** Comes from the API **`order.status`** (which is **userStatus** from DB). The order page does not map status again; it uses **order.internalStatus** for branching and **order.status** for display where needed. **ProgressTimeline** uses **step labels** (Waiting for payment, Waiting for confirmation, …) keyed by **currentStep**, not by raw status string.
- **Progress step:** **getStepFromInternalStatus(order.internalStatus)** in **app/order/[id]/page.tsx** (local function mirroring backend step logic). Step 0–4 as in §5. **ProgressTimeline** receives **currentStep={timelineStep}** and **isExpired**.
- **Warnings / errors:**
  - **Order not found:** 404 from API → **setError('Order not found')** → full-page “Order not found” + “Go to Home”.
  - **Expired:** **isExpired** true → **OrderDetails** shows “Expired” badge and “Payment Window Expired / This payment window has expired. Please create a new order to continue.”; **ProgressTimeline** uses red/error style for step 0 and X icon.
  - **Loading:** **loading** true → “Loading order...”.
  - **Syncing (polling):** When not expired and not final status, **isSyncing** true → “Checking payment status...” under the timeline.

**Files:**  
`app/order/[id]/page.tsx` (error, loading, isExpired, timelineStep, order status); `components/OrderDetails.tsx` (isExpired message); `components/ProgressTimeline.tsx` (currentStep, isExpired styling).

### 8.2 How the UI reacts to expired, failed, completed, stuck

- **Expired:** **internalStatus === 'EXPIRED'** (or **expiresAt** in the past) → **isExpired** true → “Expired” badge, “Payment Window Expired” text, timeline step 0 in error style, QR treated as expired. Polling stops (EXPIRED is in **finalStatuses**).
- **Failed:** **internalStatus === 'FAILED'** → **getStepFromInternalStatus** returns 0 (error styling). **getUserFacingStatus('FAILED')** → “Failed”. Polling stops. There is no special “Failed” message block in **OrderDetails** (only “Expired”); so failed orders show timeline at step 0 and status “Failed”.
- **Completed:** **internalStatus === 'DONE'** → step 4, “Completed”. Polling stops.
- **Stuck (e.g. NEW or CONFIRMING for a long time):** No special “stuck” message. User keeps seeing “Waiting for payment” or “Waiting for confirmation” and “Checking payment status...” until either (1) webhook/cron updates status, or (2) they leave. The frontend countdown can show 0:00 while status is still not EXPIRED if NOWPayments has not sent **expired** yet.

**Files:**  
`app/order/[id]/page.tsx` (finalStatuses, isExpired, polling stop); `components/OrderDetails.tsx`; `components/ProgressTimeline.tsx`; `lib/status-mapping.ts` (`getUserFacingStatus`, `getCurrentStep`).

---

## 9. FILE-LEVEL TRACEABILITY

| Topic | File(s) | Function / Route | Status values |
|-------|--------|------------------|----------------|
| User notification on “Exchange Now” | `components/ExchangeWidget.tsx` | Button onClick (~664–758) | N/A |
| Redirect / localStorage on success | `components/ExchangeWidget.tsx` | `router.push(\`/order/${orderId}\`)`, `localStorage.setItem(\`order_${orderId}\`, ...)` | N/A |
| Order page first load | `app/order/[id]/page.tsx` | `fetchOrder()`, initial useEffect | N/A |
| Order API (source of truth) | `app/api/order/[id]/route.ts` | GET handler, `getOrderByOrderId` | Returns `order.userStatus`, `order.internalStatus` |
| Polling | `app/order/[id]/page.tsx` | `setInterval(fetchOrder, 3000)` | Stops when internalStatus in ['DONE','FAILED','EXPIRED'] |
| Webhook URL construction | `app/api/payment/route.ts` | `getPublicBaseUrl()`, `ipnCallbackUrl` | N/A |
| Base URL | `lib/env.ts` | `getPublicBaseUrl()` | N/A |
| Webhook handler | `app/api/webhook/nowpayments/route.ts` | POST | payload.payment_status |
| Signature verification | `app/api/webhook/nowpayments/route.ts` | `verifyWebhookSignature()` | N/A |
| Idempotency + order update + history | `lib/db-orders.ts` | `processWebhookStatusUpdateAtomic()` | N/A |
| RPC (webhook) | `supabase/migrations/042_process_webhook_atomic_rpc.sql` | `process_webhook_status_update` | internal_status, user_status, status |
| Provider → internal mapping | `lib/status-mapping.ts` | `mapProviderStatusToInternal()` | waiting→AWAITING_DEPOSIT, confirming→CONFIRMING, confirmed→PAYMENT_CONFIRMED, sending→PROCESSING_BY_PROVIDER, finished/success→DONE, failed→FAILED, expired/refunded→EXPIRED |
| User-facing status | `lib/status-mapping.ts` | `getUserFacingStatus()` | NEW→“Waiting for payment”, CONFIRMING→“Waiting for confirmation”, … |
| Progress step | `lib/status-mapping.ts` | `getCurrentStep()` | Step 0–4 by internal_status |
| Order page step (local) | `app/order/[id]/page.tsx` | `getStepFromInternalStatus()` | Same as getCurrentStep |
| Expiry (no expires_at in DB) | `supabase/migrations/000_final_schema.sql`, `041_create_order_with_history_rpc.sql` | orders table, RPC INSERT | No expires_at |
| isExpired / time remaining | `app/order/[id]/page.tsx` | isExpired, defaultTimeLimit 15*60, timeRemaining | internalStatus === 'EXPIRED' or expiresAt past |
| Who sets EXPIRED | `app/api/webhook/nowpayments/route.ts`, `lib/order-reconciliation.ts` | Webhook handler, runOrderReconciliation | payment_status 'expired' → EXPIRED |
| Cron reconcile | `app/api/cron/reconcile-orders/route.ts` | GET/POST handler | Calls runOrderReconciliation |
| Admin actions | `app/api/admin/orders/[id]/actions/route.ts` | POST, switch(action) | lock, unlock, verify_payment, resync, mark_failed, approve_manual_payout, enter_payout_hash, mark_completed |
| updateOrderStatus (admin path) | `lib/db-orders.ts` | `updateOrderStatus()` | source: 'admin', state machine, admin protection |
| Webhook vs admin authority | `lib/db-orders.ts` | `updateOrderStatus()` | isWebhookUpdate bypass; isAdminDecision block |
| Order detail UI (expired message) | `components/OrderDetails.tsx` | isExpired ? “Expired” / “Payment Window Expired” | N/A |
| Timeline UI | `components/ProgressTimeline.tsx` | currentStep, isExpired | Steps 0–4, red when isExpired |

---

## 10. MISSING OR IMPLICIT LOGIC

- **expires_at not stored:** The payment route returns **expires_at** in the JSON (e.g. createdAt + 30 min for exchange), but **createOrderWithHistoryTransaction** and the **create_order_with_history** RPC do **not** insert **expires_at** into **orders**. The **orders** table has no **expires_at** column in the migrations used. So **order.expiresAt** from the API is **null**. Expiry is therefore **only** from **internal_status = 'EXPIRED'**, which is set by webhook (provider **expired**) or by cron after reading provider status. **Implication:** “Order expired but I paid” can happen if (1) user paid in time but NOWPayments sent **expired** late or by mistake, or (2) frontend shows 0:00 but backend never received **expired** and order stays NEW/CONFIRMING.

- **Expiry driven by provider:** The app does **not** set EXPIRED based on a local timer or **created_at + 15 min**. It relies on NOWPayments sending **payment_status: 'expired'** (or cron reconciling to that). So if NOWPayments never expires payments or never sends the IPN, orders will not turn EXPIRED in the DB even after the frontend countdown hits zero.

- **Frontend countdown vs backend expiry:** When the countdown reaches 0, the user sees “Time Remaining 0:00” but may still see status “Waiting for payment” until **internalStatus** becomes EXPIRED. So there can be a period where the UI suggests “time’s up” but the status is not yet “Expired”. This is **implicit** behavior from two independent mechanisms (frontend timer vs backend status).

- **“Payment sent but still pending”:** Can occur if (1) webhook is delayed or failed (signature, 5xx, etc.) so DB was not updated; (2) NOWPayments has not yet sent **confirming** / **confirmed**; (3) cron has not run yet to reconcile. User will see the update on the next poll (within 3 s) after the DB is updated by webhook or cron.

- **“Admin marked paid but user didn’t see update”:** If the order page is open and polling, the user sees the new status within one poll (3 s). If they had closed the tab or the poll failed (e.g. 5xx), they would see the update on next open or next successful poll. There is no push; only polling.

- **Manual payout override:** In manual payout mode, the webhook **does not** set status to DONE when provider sends **finished**/success; it sets PAYMENT_CONFIRMED or MANUAL_REVIEW. So “completed” for the user happens only after admin runs **mark_completed**. This is **documented** in the webhook handler and in **getPayoutMode()**; behavior is intentional.

- **Idempotency key:** Only **(payment_id, payment_status)**. So if NOWPayments sends the same event twice, the second is ignored. If they send **confirming** then **confirmed**, both create new idempotency rows and both are applied. Order of events is assumed to be consistent with NOWPayments’ design (no “confirmed” before “confirming” in practice).

---

This audit gives a precise, file- and function-level trace for user experience and webhook behavior, so you can debug cases like “Payment sent but still pending”, “Order expired but I paid”, and “Admin marked paid but user didn’t see update”.
