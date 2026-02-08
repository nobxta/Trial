# NOWPayments Live Readiness Audit

This document audits the integration for **Live** mode: endpoint/API keys, webhook verification, timeline flow, blockchain detection, and sandbox simulation isolation.

---

## 1. Endpoint & API Keys

**Question:** Does `createPayment` switch the base URL to `https://api.nowpayments.io/v1/` and use the Live API Key when the toggle is set to Live?

**Answer: Yes.**

- **Toggle source:** Payment mode is stored in the DB: `exchange_settings` table, key `payment_mode`, value `{ mode: 'live' | 'sandbox' }`. The admin toggle writes this via `setPaymentMode()` in `lib/payment-mode.ts`.
- **Config selection:** `createPayment()` in `lib/nowpayments.ts` calls **`getNowPaymentsConfig()`** (async), which in `lib/nowpayments-config.ts` calls **`getPaymentMode()`** and branches:
  - **Sandbox:** `baseUrl: 'https://api-sandbox.nowpayments.io/v1'`, `apiKey: getNowPaymentsSandboxApiKey()`.
  - **Live:** `baseUrl: getNowPaymentsApiUrl()`, `apiKey: getNowPaymentsLiveApiKey()`.
- **Live URL:** `getNowPaymentsApiUrl()` in `lib/env.ts` returns `process.env.NOWPAYMENTS_API_URL || 'https://api.nowpayments.io/v1'`. So when the toggle is Live, the default base URL is **`https://api.nowpayments.io/v1`** (overridable via env).
- **Usage:** `createPayment` uses `config.baseUrl` and `config.apiKey` for the POST to `/payment`. So Live orders use the Live API URL and Live API key.

**Files:** `lib/nowpayments-config.ts`, `lib/nowpayments.ts`, `lib/env.ts` (getNowPaymentsApiUrl), `lib/payment-mode.ts`.

---

## 2. Webhook Verification (IPN secret by order)

**Question:** In `api/webhook/nowpayments/route.ts`, is the IPN secret dynamically selected based on whether the incoming order is marked as live or sandbox? If the wrong secret is used, the signature will fail and the DB won't update.

**Answer: Yes.** The IPN secret is chosen per order using the order’s stored payment mode.

- **Lookup:** The webhook gets `payment_id` from the payload, then calls **`getOrderByPaymentId(paymentId)`** to load the order.
- **Mode from order:** `paymentMode` is taken from **`order.paymentMode`** (from the DB). If the order is not found, the handler defaults to **`'live'`** for signature verification (so live secret is used when order is missing; NOWPayments may retry).
- **Secret selection:**
  - If `paymentMode === 'sandbox'` → **`getNowPaymentsSandboxIpnSecret()`**.
  - Else → **`getNowPaymentsLiveIpnSecret()`**.
- **Verification:** `verifyWebhookSignature(rawBody, signature, ipnSecret)` uses HMAC-SHA512. Wrong secret → invalid signature → 401, and the DB is not updated.

So a **Live** order always has `order.paymentMode === 'live'` and the webhook uses the **Live** IPN secret. A **Sandbox** order uses the **Sandbox** IPN secret. Using the wrong secret would cause signature failure; the current logic matches secret to order type.

**Files:** `app/api/webhook/nowpayments/route.ts` (lines ~124–158).

**Webhook signature (Live-ready):**

- **Alphabetical sorting:** NOWPayments signs the JSON body with **keys sorted alphabetically**. The handler builds the canonical string with `buildCanonicalBodyForSignature(payload)` → `JSON.stringify(payload, Object.keys(payload).sort())` and uses that for HMAC, not the raw request body.
- **Raw body:** The route reads the body with **`request.text()`** first (raw string); Next.js does not parse it. The payload is then parsed with `JSON.parse(rawBody)`. Verification hashes the **canonical sorted JSON**, not the raw bytes.
- **HMAC-SHA512:** Signature is verified with **`crypto.createHmac('sha512', secret)`** and **`.digest('hex')`**. For Live orders the **secret** is **`getNowPaymentsLiveIpnSecret()`** (i.e. `NOWPAYMENTS_IPN_SECRET_LIVE` or `NOWPAYMENTS_IPN_SECRET`).

---

## 3. Timeline Flow (status mapping and UI)

**Question:** Trace the status mapping from waiting (address generated) → confirming (first hit on blockchain) → confirmed (block confirmations) → finished (swap complete). Is the UI component correctly subscribing to these NOWPayments status strings?

**Answer: Yes.** The mapping is consistent and the UI subscribes to **internal status** (derived from provider status), not raw strings.

**Provider → internal mapping** (`lib/status-mapping.ts`, `mapProviderStatusToInternal`):

| NOWPayments status | Internal status        | Timeline step |
|--------------------|------------------------|---------------|
| `waiting`          | AWAITING_DEPOSIT       | 0 – Awaiting deposit |
| `confirming`       | CONFIRMING             | 1 – Deposit received |
| `confirmed`        | PAYMENT_CONFIRMED      | 2 – Exchanging |
| `partially_paid`   | PAYMENT_CONFIRMED      | 2 |
| `sending`          | PROCESSING_BY_PROVIDER | 2 – Exchanging |
| `finished` / `success` | DONE               | 3 – Completed |
| `failed` / `expired` / `refunded` | FAILED / EXPIRED | 0 (or expired UI) |

**UI subscription:** The order page (`app/order/[id]/page.tsx`) gets data only from **`GET /api/order/[id]`**, which returns **`order.internalStatus`** (and `order.userStatus`) from the **database**. The timeline step is computed as:

- **`timelineStep = getStepFromInternalStatus(order.internalStatus)`** (page) or **`getCurrentStep(order.internalStatus)`** (API). Both match the step map above (0–3).

The **ProgressTimeline** component at `components/ProgressTimeline.tsx` receives **`currentStep={timelineStep}`** and **`isPaymentReceived`** (derived from internal status). It does **not** subscribe to raw NOWPayments strings; it subscribes to **internal status** via the API response, which is updated only when the webhook (or sandbox simulation for sandbox orders) updates the DB. So the flow is:

**waiting** → IPN → AWAITING_DEPOSIT → step 0  
**confirming** → IPN → CONFIRMING → step 1  
**confirmed** → IPN → PAYMENT_CONFIRMED → step 2  
**finished** / **success** → IPN → DONE → step 3  

The UI at the main content area (including the timeline) is driven by `order` state, which is refreshed by polling the order API; that API returns DB state, which is updated by the webhook. So the timeline correctly reflects these NOWPayments statuses via the internal mapping.

**Timeline and polling (why it moves from “Waiting” to “Confirming”):**

- The timeline at the main content area (e.g. under the instruction/QR block) is **ProgressTimeline**, which receives **`currentStep`** from **`getStepFromInternalStatus(order.internalStatus)`**. Step 0 = “Awaiting deposit”, step 1 = “Deposit received” (CONFIRMING).
- When the **first IPN** arrives with **`payment_status: "confirming"`**, the webhook maps it to **CONFIRMING**, runs **`processWebhookStatusUpdateAtomic()`**, and the DB is updated. The **order API** returns the updated **`internalStatus`** from the DB.
- **Polling:** The order page uses **`fetchOrder`** in a **`setInterval`**: **3 seconds** while status is NEW or AWAITING_DEPOSIT, **6 seconds** otherwise. So within at most one poll interval after the IPN updates the DB, the next **GET /api/order/[id]** returns CONFIRMING, the page sets **`order.internalStatus`** to CONFIRMING, **`timelineStep`** becomes 1, and ProgressTimeline shows “Deposit received”. Polling is active for the lifetime of the page until status is DONE/FAILED/EXPIRED (then the interval is cleared). So the timeline correctly switches from “Waiting for Deposit” to “Confirming” (step 1) once the first IPN is processed and the next poll runs.

**Files:** `lib/status-mapping.ts`, `app/order/[id]/page.tsx` (getStepFromInternalStatus, timelineStep, ProgressTimeline, fetchOrder polling), `components/ProgressTimeline.tsx`, `app/api/order/[id]/route.ts`.

---

## 4. Blockchain Detection (Live orders wait for IPN)

**Question:** Confirm that for Live orders, the system waits for the **confirming** status from the IPN before moving the UI timeline forward.

**Answer: Yes.** For Live orders, the **only** way the DB (and thus the UI) moves forward is via the **webhook** receiving IPN events from NOWPayments. There is no client-side or timer-based advancement.

- **DB updates for Live orders:** The order row is updated only when:
  1. **Webhook:** `POST /api/webhook/nowpayments` receives an IPN, verifies the signature with the **Live** IPN secret (because `order.paymentMode === 'live'`), maps `payment_status` (e.g. `confirming`, `confirmed`, `finished`) to internal status, and calls **`processWebhookStatusUpdateAtomic()`**. The DB is updated only after a valid IPN.
  2. **Admin / reconciliation:** Manual status change or cron reconciliation (same atomic update path). These are not used for normal “first hit on blockchain” flow.

- **No simulation for Live:** Sandbox simulation (below) is disabled for Live orders, so the timeline never advances for Live orders without an IPN (or admin/reconciliation).

- **Timeline:** The UI timeline is driven by **`order.internalStatus`** from the API, which comes from the DB. So the timeline moves to “Deposit received” (step 1) only when the webhook has received something like **confirming** and the DB has been updated to CONFIRMING. For Live orders, that implies NOWPayments has detected activity on-chain and sent the IPN.

So for **Live** orders, the system **does** wait for the IPN (e.g. **confirming**) from NOWPayments before moving the UI timeline forward; there is no mock or time-based advancement.

**Files:** `app/api/webhook/nowpayments/route.ts`, `lib/db-orders.ts` (processWebhookStatusUpdateAtomic), `app/order/[id]/page.tsx`, `app/api/order/[id]/route.ts`.

---

## 5. Sandbox Simulation (disabled for Live)

**Question:** Ensure that `maybeApplySandboxSimulation()` is strictly disabled or ignored when the order is marked as Live, so real payments don’t rely on fake mock logic.

**Answer: Yes.** Sandbox simulation is a no-op for Live orders.

- **Where it’s called:** **`GET /api/order/[id]`** (`app/api/order/[id]/route.ts`) loads the order from the DB, then calls **`maybeApplySandboxSimulation(order)`** before returning the response.
- **Guard in `maybeApplySandboxSimulation()`** (`lib/sandbox-simulation.ts`):

  ```ts
  if (order.paymentMode !== 'sandbox' || !order.sandboxCase) {
    return order;
  }
  ```

  So:
  - If **`order.paymentMode !== 'sandbox'`** (e.g. **`'live'`**), the function returns the **unchanged** order immediately. No simulation is applied.
  - Simulation runs only when the order is **sandbox** and has a **sandbox_case** (e.g. success/failed/expired/partially_paid).

- **Persistence of payment mode:** When the order is created in **`POST /api/payment`**, **`paymentMode: currentPaymentMode`** is passed into **`createOrderWithHistoryTransaction()`**, and the DB stores **`payment_mode`** on the order. So every order has a stable **live** or **sandbox** flag that the webhook and sandbox simulation both use.

Result: **Live** orders never go through sandbox simulation; they only change status via the webhook (or admin/reconciliation). Real payments are not affected by sandbox mock logic.

**Files:** `lib/sandbox-simulation.ts`, `app/api/order/[id]/route.ts`, `app/api/payment/route.ts`, `lib/db-orders.ts` (createOrderWithHistoryTransaction, payment_mode).

---

## Summary

| Area | Status | Notes |
|------|--------|--------|
| Endpoint & API keys | OK | Live toggle → getPaymentMode() → getNowPaymentsConfig() → Live baseUrl (https://api.nowpayments.io/v1) and Live API key. |
| Webhook verification | OK | IPN secret chosen by order.paymentMode (live → Live secret, sandbox → Sandbox secret). |
| Timeline flow | OK | waiting→confirming→confirmed→finished mapped to internal status; UI uses internal status from API (DB). |
| Blockchain detection | OK | Live orders advance only via IPN (e.g. confirming); no client or timer-based advancement. |
| Sandbox simulation | OK | maybeApplySandboxSimulation() returns immediately when order.paymentMode !== 'sandbox'; Live orders never simulated. |

The NOWPayments integration is **Live-ready** for the areas audited: Live uses the correct API URL and key, webhook verification uses the correct IPN secret per order, the timeline reflects NOWPayments status flow via the DB, Live orders depend only on IPN for blockchain detection, and sandbox simulation is strictly limited to sandbox orders.
