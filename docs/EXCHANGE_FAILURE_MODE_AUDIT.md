# Exchange System – Failure-Mode and Edge-Case Audit

Senior backend + payments audit. For each issue: title, code locations, reproduction, root cause, impact, live/sandbox/both, current behavior, concrete fix. No assumptions that external services, webhooks, cron, or admin are always available or correct.

---

## Issue 1: Orphan payment – payment at NOWPayments but no order in DB

**1. Issue title**  
Orphan payment: payment created at NOWPayments, order creation fails, order never exists; webhook later returns 200 “Order not found” so NOWPayments never retries.

**2. Exact code locations**
- `app/api/payment/route.ts`: `createPayment(paymentParams)` then `createOrderWithHistoryTransaction(userId, orderData)` in try/catch (exchange path ~164–189, payment path ~285–302).
- `app/api/webhook/nowpayments/route.ts`: `getOrderByPaymentId(paymentId)`; when null, returns 200 with `{ received: true, message: 'Order not found' }` (~274–286).

**3. Step-by-step reproduction**
1. User submits exchange; POST /api/payment runs.
2. `createPayment()` succeeds (payment and payment_id exist at NOWPayments).
3. `createOrderWithHistoryTransaction()` throws (DB error, constraint, timeout, etc.).
4. Handler catches, returns 500 “Order could not be saved”; user sees error.
5. Later NOWPayments sends IPN for that payment_id.
6. Webhook: `getOrderByPaymentId(paymentId)` returns null → response 200 “Order not found”.
7. NOWPayments does not retry; order is never created.

**4. Root cause**  
Payment is created before order; order creation is not in the same transactional boundary as payment creation (API is external). On DB failure we do not cancel/refund the payment. Webhook treats “order not found” as success (200) to avoid retries, so the system never recovers.

**5. Worst-case impact**  
User paid; we have no order record; support cannot tie payment_id to user or complete the exchange; possible fund loss or protracted support/refund; trust loss.

**6. Appears in**  
Both.

**7. Current behavior**  
User gets 500; payment exists at NOWPayments; no order row; later webhook returns 200; no retry; order never created.

**8. Concrete fix**
- Keep “create payment then create order” but add a recovery path: e.g. admin or cron can “claim” an orphan payment_id (with proof) and create the order via a dedicated API that calls the same `createOrderWithHistoryTransaction` with payment_id and stored/verified payment details.
- Optionally: after DB failure, call NOWPayments to cancel/refund the payment if the API supports it, and return a clear error to the user.
- Document orphan payment_id handling and ensure webhook logs payment_id when order is not found for alerting.

---

## Issue 2: Admin “Verify payment” uses current payment mode instead of order’s mode

**1. Issue title**  
Admin Verify payment calls NOWPayments with current payment mode; for sandbox orders it may call live API (or vice versa), causing wrong or missing data.

**2. Exact code locations**
- `app/api/admin/orders/[id]/actions/route.ts`: `case 'verify_payment':` → `getPaymentStatus(currentOrder.payment_id)` with no second argument (~134).
- `lib/nowpayments.ts`: `getPaymentStatus(paymentId, mode?)` when `mode` is undefined uses `getNowPaymentsConfig()` (current global mode) (~220–222).

**3. Step-by-step reproduction**
1. Create order in sandbox (payment_mode = 'sandbox', payment_id from sandbox).
2. In admin, switch payment mode to live.
3. Open that order in admin, click Verify payment.
4. `getPaymentStatus(payment_id)` is called without mode → uses current (live) config.
5. Live API is called with sandbox payment_id → 404 or wrong payment.
6. Verify fails or shows incorrect comparison.

**4. Root cause**  
Verify action does not pass the order’s stored `payment_mode` into `getPaymentStatus`; reconciliation and webhook use order mode, but verify uses global config.

**5. Worst-case impact**  
Admin sees “Failed to verify” or misleading mismatch; wrong decisions (e.g. resync/mark failed) based on wrong provider data; confusion in support.

**6. Appears in**  
Both (when global mode differs from order’s mode).

**7. Current behavior**  
Verify uses current mode; for sandbox orders in live mode (or vice versa) API call fails or returns wrong payment; comparison is meaningless or errors.

**8. Concrete fix**  
In `app/api/admin/orders/[id]/actions/route.ts` in `verify_payment`, call:
`getPaymentStatus(currentOrder.payment_id, currentOrder.payment_mode ?? undefined)`
and ensure `currentOrder` includes `payment_mode` from the DB (it already comes from `select('*')`). Same pattern is already used in reconciliation (`getPaymentStatus(paymentId, order.paymentMode ?? undefined)`).

---

## Issue 3: Reconciliation skips orders stuck in AWAITING_DEPOSIT

**1. Issue title**  
Cron reconciliation only considers NEW and CONFIRMING; orders stuck in AWAITING_DEPOSIT are never polled and can stay stuck forever.

**2. Exact code locations**
- `lib/db-orders.ts`: `findStaleOrders()` uses `.in('internal_status', ['NEW', 'CONFIRMING'])` (~337–340).
- `lib/order-reconciliation.ts`: `runOrderReconciliation()` calls `findStaleOrders()` (~66).

**3. Step-by-step reproduction**
1. Order created (internal_status NEW).
2. Webhook delivers “waiting” → RPC sets internal_status AWAITING_DEPOSIT.
3. No further webhooks (loss, delay, or NOWPayments bug); payment later confirms at provider.
4. Cron runs; `findStaleOrders` only selects NEW and CONFIRMING.
5. This order is never selected; reconciliation never polls NOWPayments for it.
6. Order stays AWAITING_DEPOSIT indefinitely.

**4. Root cause**  
Reconciliation was designed for “never got first webhook” (NEW) or “stuck in confirming” (CONFIRMING). AWAITING_DEPOSIT is a valid intermediate state that can also miss later webhooks; it is not included in the stale filter.

**5. Worst-case impact**  
User has paid; order never moves to CONFIRMING/PAYMENT_CONFIRMED/DONE; admin must manually resync or fix; delayed or lost completion.

**6. Appears in**  
Both.

**7. Current behavior**  
Orders in AWAITING_DEPOSIT are never picked by reconciliation; they only advance if a webhook arrives or admin resyncs.

**8. Concrete fix**  
In `lib/db-orders.ts` in `findStaleOrders`, include AWAITING_DEPOSIT:
`.in('internal_status', ['NEW', 'AWAITING_DEPOSIT', 'CONFIRMING'])`
so that any order that has not reached PAYMENT_CONFIRMED (or later) and is older than the threshold is reconciled.

---

## Issue 4: Non-atomic checkAndMark allows duplicate notifications and duplicate ledger entries

**1. Issue title**  
Idempotency for order-status email and ledger uses check-then-mark (hasRun + markRun); under concurrency two callers can both “win” and send two emails or record two ledger entries.

**2. Exact code locations**
- `lib/idempotency.ts`: `checkAndMark()` = `hasRun(scope, key)` then `markRun(scope, key)` (~64–72). `markRun()` on unique violation returns true (~51), so both callers can get “marked”.
- `lib/notifications.ts`: `notifyOrderStatus()` uses `checkAndMark(scope, idempotencyKey)` then `sendNotification()` (~106–121).
- `lib/ledger.ts`: `recordOrderCompletion()` uses `checkAndMark(scope, idempotencyKey)` then `credit()` (~171–192).

**3. Step-by-step reproduction**
1. Two webhook requests for the same (payment_id, payment_status) are processed (e.g. retries or duplicate delivery).
2. Webhook idempotency (RPC) makes only one DB update; but after that, both handlers call `notifyOrderStatus(order.userId, order.orderId, newStatus)`.
3. Both call `checkAndMark('order_status_email', key)`: both `hasRun` false, both call `markRun`: first INSERT succeeds, second gets 23505 and `markRun` returns true. So both `checkAndMark` return true.
4. Both proceed to `sendNotification` → two emails for the same order+status.
5. Similarly, two DONE webhooks (e.g. “finished” and “success”) or webhook + admin mark_completed can both pass `checkAndMark` for ledger and both call `credit()` → duplicate ledger entries.

**4. Root cause**  
Idempotency is implemented as read-then-insert; there is no single atomic “claim” (e.g. INSERT with ON CONFLICT). So two concurrent callers can both see “not run” and both “mark,” and both proceed.

**5. Worst-case impact**  
Duplicate “Order completed” (or other status) emails; duplicate ledger credits for the same order; incorrect balances and accounting; user confusion.

**6. Appears in**  
Both.

**7. Current behavior**  
Under concurrent calls for the same order+status (or same order completion), duplicate emails and/or duplicate ledger entries can be written.

**8. Concrete fix**
- Replace “check then mark” with a single atomic claim. Example: add `tryClaimIdempotency(scope: string, key: string): Promise<boolean>` that does one INSERT (e.g. `insert into idempotency_keys(scope, key) values ($1,$2) on conflict (scope, key) do nothing returning id`); return true only if a row was returned (i.e. we claimed it). Use this in `notifyOrderStatus` and `recordOrderCompletion` instead of `checkAndMark`.
- Alternatively, keep a single INSERT in application code and treat unique violation as “already claimed” (do not proceed); only the caller that successfully inserts may send email or write ledger.

---

## Issue 5: Ledger idempotency claimed before credit – permanent skip on credit failure

**1. Issue title**  
recordOrderCompletion marks idempotency as run before performing credit(); if credit() fails, we return false but never retry, so order can be DONE with no ledger entry.

**2. Exact code locations**
- `lib/ledger.ts`: `recordOrderCompletion()` calls `checkAndMark(scope, idempotencyKey)` then `credit()` (~171–196). On `!userCreditSuccess` it returns false (~194–196); idempotency key remains set.

**3. Step-by-step reproduction**
1. Webhook sets order to DONE and calls `recordOrderCompletion(...)`.
2. `checkAndMark` runs and marks the key (or appears to “win” in current implementation).
3. `credit(...)` fails (DB error, constraint, timeout).
4. Function returns false; webhook still returns 200.
5. No retry of recordOrderCompletion for this order (idempotency already set).
6. Order stays DONE in orders table; ledger has no payout entry for this order.

**4. Root cause**  
Idempotency is claimed before the side effect (credit). On failure we do not clear or retry the claim, so the system believes “already recorded” and never tries again.

**5. Worst-case impact**  
Balance/ledger inconsistent with completed orders; reporting wrong; possible disputes; need manual ledger correction.

**6. Appears in**  
Both.

**7. Current behavior**  
If credit fails after idempotency is marked, order is DONE but ledger is not updated and is never retried automatically.

**8. Concrete fix**
- Prefer: perform credit first (or inside a transaction with idempotency). Only after credit succeeds, insert idempotency (or use a DB transaction: insert idempotency + insert ledger rows; commit; on conflict on idempotency do nothing and skip). That way “marked” only when ledger was actually written.
- If keeping “claim then credit”: add a background job or cron that finds orders with internal_status = DONE and no corresponding ledger entry (e.g. by order_id) and retries recordOrderCompletion (or a dedicated “record ledger for order” step) with proper idempotency so only one writer wins and only one ledger row is created. Do not rely on “we already marked” to mean “we already succeeded.”

---

## Issue 6: Cron endpoints unauthenticated when CRON_SECRET is unset

**1. Issue title**  
process-email-queue and reconcile-orders only require auth when CRON_SECRET is set; when unset, anyone can call them.

**2. Exact code locations**
- `app/api/cron/process-email-queue/route.ts`: `if (cronSecret && authHeader !== \`Bearer ${cronSecret}\`)` then 401 (~24–31).
- `app/api/cron/reconcile-orders/route.ts`: same pattern (~14–20).

**3. Step-by-step reproduction**
1. Deploy without CRON_SECRET (or CRON_SECRET empty).
2. Attacker or script calls GET /api/cron/process-email-queue and GET/POST /api/cron/reconcile-orders without Authorization.
3. Condition is false (cronSecret falsy); no 401; handler runs.
4. Attacker can drain/trigger email queue or trigger reconciliation repeatedly.

**4. Root cause**  
Auth is applied only when `cronSecret` is truthy; “no secret” is treated as “no auth required” instead of “reject in production.”

**5. Worst-case impact**  
Abuse of cron endpoints (load, queue drain); in production, unintended reconciliation or email processing; possible information leakage.

**6. Appears in**  
Both (worst in production).

**7. Current behavior**  
If CRON_SECRET is unset or empty, cron routes return 200 and run for any caller.

**8. Concrete fix**
- In production (e.g. NODE_ENV === 'production' or a dedicated env), require CRON_SECRET and reject with 401 if missing or if Authorization header does not match.
- Example: `const required = process.env.NODE_ENV === 'production'; if ((required && !cronSecret) || (cronSecret && authHeader !== \`Bearer ${cronSecret}\`)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });`
- Document that production must set CRON_SECRET and that Vercel cron must send it.

---

## Issue 7: Cron not sending Authorization causes silent email/reconciliation failure

**1. Issue title**  
If Vercel Cron (or caller) does not send Bearer CRON_SECRET, process-email-queue and reconcile-orders return 401; emails stay pending and reconciliation never runs.

**2. Exact code locations**
- `app/api/cron/process-email-queue/route.ts`: 401 when `cronSecret && authHeader !== \`Bearer ${cronSecret}\`` (~24–31).
- `app/api/cron/reconcile-orders/route.ts`: same (~14–20).
- Vercel cron configuration: `vercel.json` crons do not set headers; Vercel injects auth per docs (need to confirm project uses “Cron Secret” and header).

**3. Step-by-step reproduction**
1. CRON_SECRET is set in env.
2. Vercel Cron is misconfigured (e.g. wrong secret, or cron not sending Authorization).
3. Every 5 min (or 15 min) cron hits the endpoint without valid Bearer token.
4. Endpoint returns 401; no emails sent from queue; no reconciliation.
5. No alerting; emails and stuck orders accumulate.

**4. Root cause**  
Cron depends on correct Vercel (or external) configuration to send the secret. If that is wrong, the app correctly rejects but there is no visibility or fallback.

**5. Worst-case impact**  
All queued emails (verification, order status) never send; reconciliation never runs; orders stuck in NEW/CONFIRMING (and AWAITING_DEPOSIT once fixed); users and support assume system is broken.

**6. Appears in**  
Both.

**7. Current behavior**  
Invalid or missing cron auth → 401; queue and reconciliation do not run; failure is silent unless someone checks queue size or stuck orders.

**8. Concrete fix**
- Document that Vercel Cron must send `Authorization: Bearer <CRON_SECRET>` (or equivalent) and verify in project dashboard.
- Add observability: e.g. periodic check (or separate cron) that records “last successful process-email-queue run” and “last successful reconcile-orders run”; alert if no success in N minutes. Optionally expose a small admin-only “cron health” view showing last run and pending queue count.
- Consider idempotent “self-invoke” from a serverless function that does have the secret (e.g. from a single scheduled job that calls both endpoints with the secret) so one misconfiguration does not disable both.

---

## Issue 8: mark_completed allows CONFIRMING but state machine blocks CONFIRMING → DONE

**1. Issue title**  
Admin action mark_completed allows orders in CONFIRMING, but updateOrderStatus enforces state machine and rejects CONFIRMING → DONE, so API returns 400.

**2. Exact code locations**
- `app/api/admin/orders/[id]/actions/route.ts`: `case 'mark_completed':` allowedStatuses includes `'CONFIRMING'` (~406). Then `updateOrderStatus(params.id, 'DONE', ...)` (~418).
- `lib/order-state.ts`: CONFIRMING allows only PAYMENT_CONFIRMED, EXPIRED, FAILED (~33–36). DONE is not allowed from CONFIRMING.
- `lib/db-orders.ts`: updateOrderStatus (non-webhook) calls `canTransition(currentInternalStatus, internalStatus)` and returns current order without update when false (~593–617).

**3. Step-by-step reproduction**
1. Order is in CONFIRMING (payment seen, not yet confirmed).
2. Admin (or API client) calls POST .../actions with action mark_completed.
3. allowedStatuses check passes (CONFIRMING is allowed).
4. updateOrderStatus(id, 'DONE', ...) runs; canTransition('CONFIRMING', 'DONE') is false.
5. updateOrderStatus returns current order without changing status; statusChanged is false; handler returns 400 “Cannot transition order from CONFIRMING to DONE.”

**4. Root cause**  
Business rule allows “mark completed” from CONFIRMING (e.g. to support manual override), but the shared state machine does not allow CONFIRMING → DONE, and updateOrderStatus enforces the state machine for admin.

**5. Worst-case impact**  
Confusing 400 for admin; if UI ever showed “Confirmed” for CONFIRMING (e.g. via API), it would always fail. Currently OrdersTable only shows the button for MANUAL_PAYOUT_STATUSES (PAYMENT_CONFIRMED, MANUAL_REVIEW, PROCESSING_BY_PROVIDER), so CONFIRMING is not shown; impact is limited to direct API use.

**6. Appears in**  
Both.

**7. Current behavior**  
mark_completed from CONFIRMING returns 400 and does not update the order.

**8. Concrete fix**
- Either remove CONFIRMING from allowedStatuses in mark_completed so API and state machine align (admin cannot “complete” from CONFIRMING).
- Or explicitly allow CONFIRMING → DONE for admin: e.g. in updateOrderStatus, when source === 'admin' and target is DONE, allow from CONFIRMING as well (bypass or extend canTransition for this case), and document that this is an override when admin has verified payout.

---

## Issue 9: notifyOrderStatus called with null userId (anonymous order)

**1. Issue title**  
Webhook and admin actions call notifyOrderStatus(order.userId, ...) or notifyOrderStatus(currentOrder.user_id, ...); when user_id is null (anonymous order), this can behave poorly or throw.

**2. Exact code locations**
- `app/api/webhook/nowpayments/route.ts`: `notifyOrderStatus(order.userId, order.orderId, newStatus.toLowerCase(), request)` (~432).
- `app/api/admin/orders/[id]/actions/route.ts`: `notifyOrderStatus(currentOrder.user_id, params.id, updatedOrder.internalStatus, request)` (~294, ~349, ~470).
- `lib/notifications.ts`: `sendNotification(userId, ...)` → `getUserWithPreferences(userId)` (~31).
- `lib/db.ts`: `getUserWithPreferences(userId: string)` uses `.eq('id', userId)` (~191); passing null may produce unexpected Supabase/Postgres behavior.

**3. Step-by-step reproduction**
1. Anonymous user creates order (user_id null).
2. Order completes (webhook DONE or admin mark_completed).
3. notifyOrderStatus(null, orderId, 'done', request) is called.
4. sendNotification(null, ...) → getUserWithPreferences(null); .eq('id', null) may match no row or behave inconsistently.
5. If null is returned, code returns false (no email); if something throws, webhook/admin handler may catch and log but still return 200/success.

**4. Root cause**  
No guard for null userId before calling sendNotification; type allows string but callers pass null for anonymous orders.

**5. Worst-case impact**  
Possible runtime error in getUserWithPreferences or downstream; unhandled rejection could affect response or logging. Functionally, anonymous users correctly get no email when user is null and query returns null.

**6. Appears in**  
Both.

**7. Current behavior**  
Usually: getUserWithPreferences(null) returns null (no row); sendNotification returns false; no email. Risk of odd behavior or throw depending on Supabase/JS.

**8. Concrete fix**  
At the start of notifyOrderStatus, add: `if (userId == null || userId === '') return true;` so we do not call sendNotification or DB with null. Optionally type userId as `string | null` and handle null explicitly in callers.

---

## Issue 10: Reconciliation uses current payment mode when order.payment_mode is null

**1. Issue title**  
findStaleOrders returns orders that may have payment_mode null (e.g. created before column or migration). Reconciliation calls getPaymentStatus(paymentId, order.paymentMode ?? undefined); when null, current global mode is used and can be wrong.

**2. Exact code locations**
- `lib/order-reconciliation.ts`: `getPaymentStatus(paymentId, order.paymentMode ?? undefined)` (~86).
- `lib/nowpayments.ts`: when mode is undefined, `getNowPaymentsConfig()` (current mode) is used (~220–222).

**3. Step-by-step reproduction**
1. Order exists with payment_id set and payment_mode null (legacy or migration gap).
2. Order was created in sandbox; current global mode is live.
3. Reconciliation runs; findStaleOrders returns this order.
4. getPaymentStatus(paymentId, undefined) uses live config; live API is called with a sandbox payment_id.
5. Live API returns 404 or wrong payment; reconciliation marks error or skips; order stays stuck.

**4. Root cause**  
Old or migrated orders can have null payment_mode; reconciliation passes undefined and falls back to current mode, which may not match the payment’s environment.

**5. Worst-case impact**  
Stuck orders that reconciliation cannot fix; repeated errors in logs; support must manually resync with correct mode (if available).

**6. Appears in**  
Both (when there are orders with null payment_mode and mode was switched).

**7. Current behavior**  
Reconciliation uses current mode for those orders; provider call can fail or return wrong payment; order is not updated.

**8. Concrete fix**
- Prefer storing payment_mode for all orders (backfill nulls from creation context if possible). For reconciliation, when order.payment_mode is null, try both modes (e.g. try sandbox first, then live) or infer from payment_id format if documented by NOWPayments; or skip and log “unknown mode” and alert for manual review.
- At minimum: when getPaymentStatus fails with 404/error for an order with null payment_mode, retry once with the other mode (sandbox vs live) and document behavior.

---

## Issue 11: Webhook returns 200 when order not found, preventing retry

**1. Issue title**  
When getOrderByPaymentId returns null (e.g. order not yet committed or replication lag), webhook responds 200 “Order not found”; NOWPayments stops retrying and the update is lost.

**2. Exact code locations**
- `app/api/webhook/nowpayments/route.ts`: after `getOrderByPaymentId(paymentId)` when `!order` (~274–286), returns NextResponse.json({ received: true, message: 'Order not found' }, { status: 200 }).

**3. Step-by-step reproduction**
1. Payment is created and order is created in DB; commit is delayed or replica lag.
2. NOWPayments sends IPN immediately.
3. Webhook runs; getOrderByPaymentId(paymentId) returns null (e.g. read from replica that does not have the row yet).
4. Handler returns 200 “Order not found.”
5. NOWPayments does not retry; when DB commit completes, order exists but status was never updated from this webhook.

**4. Root cause**  
“Order not found” is treated as success (200) to avoid NOWPayments retrying forever for truly orphan payments; but transient “not found” (e.g. lag) is indistinguishable, so retries are disabled.

**5. Worst-case impact**  
Order exists and payment is confirmed at provider but our DB never receives the update; order stays NEW/CONFIRMING until reconciliation or manual resync; delayed completion.

**6. Appears in**  
Both (more likely under load or with read replicas).

**7. Current behavior**  
Any “order not found” yields 200; no retry; possible permanent missed update if the only delivery was during the transient window.

**8. Concrete fix**
- Option A: Return 503 (or 500) when order is not found so NOWPayments retries; accept that true orphans will cause repeated retries until you add a separate “known orphan” list or idempotency that returns 200 after N retries.
- Option B: Keep 200 for “order not found” but add a short delayed retry in your own system: e.g. push payment_id to a queue and have a worker re-fetch order and apply status after a few seconds; if order still missing after N attempts, then treat as orphan and return 200 (and alert).
- Option C: Ensure webhook reads from primary (no replica lag) so that “order not found” is only for true orphans; document and monitor “order not found” counts and alert if high.

---

## Issue 12: Email queue and reconciliation have no operational visibility

**1. Issue title**  
No alerting or dashboard when process-email-queue or reconcile-orders fail or when email queue backs up; failures are silent.

**2. Exact code locations**
- `app/api/cron/process-email-queue/route.ts`: returns 401/500 and logs; no metric or alert (~21–56, catch block).
- `app/api/cron/reconcile-orders/route.ts`: same (~12–56).
- No code that records “last successful run” or “pending queue size” for alerting.

**3. Step-by-step reproduction**
1. CRON_SECRET is wrong or cron is disabled; or SMTP is down; or Supabase is slow.
2. process-email-queue repeatedly returns 401 or 500, or sends fail and emails stay pending.
3. reconcile-orders repeatedly returns 401 or 500.
4. No one is notified; queue grows; orders stay stuck until someone checks.

**4. Root cause**  
Cron handlers only log and return HTTP status; there is no integration with monitoring/alerting or health checks.

**5. Worst-case impact**  
Prolonged outage of email and reconciliation without detection; user and support impact; compliance or SLA breaches.

**6. Appears in**  
Both.

**7. Current behavior**  
Failures are only visible in logs or by manually calling endpoints or checking DB (email_queue, orders).

**8. Concrete fix**
- Emit metrics or write to a “cron_runs” table (e.g. endpoint name, success/failure, timestamp, error message); add a simple admin or status page that shows last success time and, for email, count of pending/failed rows.
- Integrate with existing monitoring (e.g. Vercel alerts, Sentry, or cron job that hits a “cron health” endpoint and alerts if last success is older than threshold).
- Consider alerting when email_queue pending count exceeds N or when oldest pending is older than M minutes.

---

## Issue 13: process-email-queue treats empty CRON_SECRET as “no auth”

**1. Issue title**  
If CRON_SECRET is set to empty string (e.g. by mistake), the check `cronSecret && ...` is false, so no auth is applied and the endpoint is public.

**2. Exact code locations**
- `app/api/cron/process-email-queue/route.ts`: `const cronSecret = process.env.CRON_SECRET;` then `if (cronSecret && authHeader !== \`Bearer ${cronSecret}\`)` (~24–26).
- Same pattern in reconcile-orders, update-prices, update-exchange-limits.

**3. Step-by-step reproduction**
1. Set CRON_SECRET="" or CRON_SECRET="   " (if trimmed elsewhere).
2. Request GET /api/cron/process-email-queue without Authorization.
3. cronSecret is falsy; condition is false; no 401; handler runs.

**4. Root cause**  
Auth is gated on “secret is set”; empty string is set but falsy, so treated as “no secret.”

**5. Worst-case impact**  
Same as Issue 6: cron endpoints callable by anyone when secret is empty.

**6. Appears in**  
Both.

**7. Current behavior**  
Empty CRON_SECRET → no auth; endpoint runs for any request.

**8. Concrete fix**  
Treat “must have valid secret in production” explicitly: e.g. `const cronSecret = process.env.CRON_SECRET?.trim();` and in production require non-empty: `if (process.env.NODE_ENV === 'production' && !cronSecret) return 401;` and `if (cronSecret && authHeader !== \`Bearer ${cronSecret}\`) return 401;` so that empty string in production causes 401.

---

## Cross-references

- **Issue 2** (verify_payment mode) and **Issue 10** (reconciliation null payment_mode): both are “use order’s payment mode, not current global mode”; fix verify (2) and reconciliation (10) consistently.
- **Issue 4** (checkAndMark race) and **Issue 5** (ledger claim-before-credit): same idempotency primitive; fixing 4 with atomic claim helps 5 if ledger is changed to “claim only after credit” or “claim inside same transaction as credit.”
- **Issue 6** (cron unauthenticated when secret unset) and **Issue 7** (cron auth failure) and **Issue 13** (empty secret): all cron auth; fix together (require secret in production, validate header, treat empty as invalid).

---

End of audit.
