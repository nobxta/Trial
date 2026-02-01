# System Hardening: State Regression

Identification of where the system allows state regression and where it should be prevented. No new features; minimal guards only.

---

## 1. FINAL STATES

### Which internal_status values are FINAL?

**Answer:** **DONE**, **FAILED**, **EXPIRED**.

**Source:** `lib/order-state.ts` — `STATE_TRANSITIONS['DONE'] = []`, `STATE_TRANSITIONS['FAILED'] = []`, `STATE_TRANSITIONS['EXPIRED'] = []`. `isTerminalState()` returns true only for these three.

### For each final state: can it currently be overwritten?

| Final state | By webhook? | By cron? | By admin? | By polling logic? |
|-------------|-------------|----------|-----------|--------------------|
| **DONE**    | **YES. UNSAFE.** | NO | NO (state machine blocks) | N/A (webhook path used) |
| **FAILED**  | **YES. UNSAFE.** | NO | NO | N/A |
| **EXPIRED** | **YES. UNSAFE.** | NO | No (resync/mark_completed blocked from EXPIRED) | N/A |

- **By webhook:** RPC `process_webhook_status_update` (`supabase/migrations/042_process_webhook_atomic_rpc.sql`) has **no** check on current `internal_status`. It always runs the UPDATE (lines 41–53). So a late or duplicate webhook with e.g. `payment_status = confirming` can set `internal_status = CONFIRMING` and overwrite DONE/FAILED/EXPIRED. **ACCIDENTAL** (no guard was added).
- **By cron:** Cron only selects orders with `internal_status IN ('NEW', 'CONFIRMING')` (`lib/db-orders.ts` — `findStaleOrders`, lines 337–341). So cron **never** touches DONE, FAILED, or EXPIRED. **Safe by design.**
- **By admin:** `updateOrderStatus` (`lib/db-orders.ts`) enforces `canTransition(current, target)` for non-webhook updates (`lib/order-state.ts` — DONE/FAILED/EXPIRED have empty allowed lists). So admin cannot move from DONE/FAILED/EXPIRED to another status via `updateOrderStatus`. **Enforced.** Admin actions resync and mark_completed explicitly block when current is EXPIRED (`app/api/admin/orders/[id]/actions/route.ts`).
- **By polling logic:** Webhook handler and cron call `processWebhookStatusUpdateAtomic` (same RPC). No other polling path updates order status. So “polling logic” = cron; cron does not select final states. **Safe.**

---

## 2. WEBHOOK REGRESSION

### Cases where a webhook can move an order BACKWARD

| From (current) | To (incoming) | Allowed today? | Example trigger |
|---------------|---------------|----------------|-----------------|
| DONE          | CONFIRMING    | **YES. UNSAFE.** | Late/retry webhook `payment_status = confirming` |
| DONE          | PAYMENT_CONFIRMED | **YES. UNSAFE.** | Late webhook `payment_status = confirmed` |
| DONE          | AWAITING_DEPOSIT | **YES. UNSAFE.** | Late webhook `payment_status = waiting` |
| FAILED        | CONFIRMING    | **YES. UNSAFE.** | Late webhook `payment_status = confirming` |
| EXPIRED       | CONFIRMING    | **YES. UNSAFE.** | Late webhook `payment_status = confirming` |
| PAYMENT_CONFIRMED | CONFIRMING | YES (allowed by state machine for admin path; webhook path has no check) | Late webhook `payment_status = confirming` |

Only the **final states** (DONE, FAILED, EXPIRED) are in scope for “must never regress.” PAYMENT_CONFIRMED → CONFIRMING is a regression but not from a final state; hardening focus: **final states must not be overwritten.**

### Exact code path allowing reversal

- **RPC:** `process_webhook_status_update` in `supabase/migrations/042_process_webhook_atomic_rpc.sql`.
- **SQL:** Step 3 (lines 41–53): `UPDATE orders SET internal_status = COALESCE(..., internal_status), ... WHERE order_id = p_params->>'order_id'`. There is **no** condition on current `internal_status`. So any incoming `p_params->>'internal_status'` is applied regardless of current state.
- **Missing guard:** No `AND internal_status NOT IN ('DONE', 'FAILED', 'EXPIRED')` (or equivalent) before performing the update. No check that current status is final before overwriting.
- **Intentional or accidental:** **ACCIDENTAL.** Webhook was implemented as “apply provider status”; final-state immunity was not added.

---

## 3. ADMIN VS WEBHOOK PRECEDENCE

### When admin sets a FINAL state, should webhook still override it?

**Answer: NO.** Once an order is DONE, FAILED, or EXPIRED (whether set by admin or webhook), it should not be changed by a later webhook. Admin final state should be as authoritative as webhook final state.

### Minimal code change to make admin FINAL states immune to webhook regression

**Enforce in one place:** the RPC that applies webhook (and cron) updates. Do **not** add `status_source` logic (“if admin set it, don’t touch”); treat all final states the same regardless of who set them.

- **Where:** `supabase/migrations/042_process_webhook_atomic_rpc.sql`, after Step 2 (after `SELECT internal_status INTO v_old_internal_status` and the order-not-found check), before Step 3 (UPDATE).
- **What:** If current `internal_status` is one of DONE, FAILED, EXPIRED, do **not** update. Return current order row and treat as success (idempotency row already inserted; event is consumed but not applied).
- **Effect:** Webhook and cron both use this RPC. Final states are never overwritten by webhook or cron. Admin final state is protected without special-casing admin.

---

## 4. CRON SAFETY

### Can cron ever regress state?

**No.** Cron only processes orders with `internal_status IN ('NEW', 'CONFIRMING')` (`lib/db-orders.ts` — `findStaleOrders`). It never selects DONE, FAILED, EXPIRED, or PAYMENT_CONFIRMED, etc. So cron never runs the RPC for an order that is already in a later or final state. It can only advance NEW → … or CONFIRMING → …. **Safe by design.**

### Can cron ever override admin intent?

**No.** If admin set an order to DONE/FAILED/EXPIRED, that order is no longer NEW or CONFIRMING, so it is never selected by `findStaleOrders`. Cron does not touch it. If admin set MANUAL_REVIEW or PAYMENT_CONFIRMED, those are also not in the stale list, so cron does not touch them. **Safe by design.**

### Is cron currently safe by accident or by design?

**By design.** The stale list is explicitly `['NEW', 'CONFIRMING']` only. No change needed for cron.

---

## 5. REQUIRED INVARIANTS

### Invariant 1: “Once DONE, never leave DONE”

- **Enforced today?** **NO.** RPC `process_webhook_status_update` can set `internal_status` to any value; no check for current = DONE.
- **Where it should be enforced:** In the RPC that applies webhook/cron updates (single source of truth for “provider says X” updates). **File:** `supabase/migrations/042_process_webhook_atomic_rpc.sql`. **Function:** `process_webhook_status_update`.

---

### Invariant 2: “Once FAILED, never leave FAILED”

- **Enforced today?** **NO.** Same RPC; no guard.
- **Where it should be enforced:** Same RPC. **File:** `supabase/migrations/042_process_webhook_atomic_rpc.sql`.

---

### Invariant 3: “Once EXPIRED, only admin can recover”

- **Enforced today?** **NO.** Webhook can overwrite EXPIRED with CONFIRMING, etc. Admin cannot recover via UI (resync and mark_completed are blocked from EXPIRED). So today: webhook can regress EXPIRED; admin cannot fix it via standard actions.
- **Where it should be enforced:** (1) **No regression:** Same RPC — do not allow webhook/cron to overwrite EXPIRED. (2) **Admin recovery:** Out of scope for this hardening (would be a new admin action or DB-only procedure). This doc only adds the “do not regress” guard.

---

### Invariant 4: “Webhook may advance state but never regress it (from final state)”

- **Enforced today?** **NO.** Webhook path applies any incoming status.
- **Where it should be enforced:** RPC. **File:** `supabase/migrations/042_process_webhook_atomic_rpc.sql`. Minimal form: “If current `internal_status` is DONE, FAILED, or EXPIRED, do not update.”

---

## 6. SMALLEST POSSIBLE FIXES

### Fix: Prevent webhook/cron from overwriting final states

**Invariant enforced:** Once DONE, FAILED, or EXPIRED, do not apply webhook or cron update (same RPC).

**Where:** `supabase/migrations/044_webhook_guard_final_states.sql`, function `process_webhook_status_update`.

**Change:** After Step 2 (read current `internal_status`; order-not-found check), before Step 3 (UPDATE), add:

- **Condition:** If `v_old_internal_status` is one of `'DONE'`, `'FAILED'`, `'EXPIRED'`, then do **not** run the UPDATE or insert history.
- **Behavior:** Return current order row as success (`already_processed = false`, `order = current row`). Idempotency row remains (event consumed, not applied). Caller (webhook or cron) sees “success” and does not retry; order state unchanged.

**One guard block (pseudocode):**

```sql
-- After Step 2, before Step 3:
IF v_old_internal_status IN ('DONE', 'FAILED', 'EXPIRED') THEN
  SELECT * INTO v_row FROM orders WHERE order_id = p_params->>'order_id';
  RETURN jsonb_build_object('already_processed', false, 'order', to_jsonb(v_row));
END IF;
```

**No refactors.** No change to webhook handler, cron, or admin routes. Single conditional in the RPC.

---

## Summary

| Item | Status | Action |
|------|--------|--------|
| Final states (DONE, FAILED, EXPIRED) | Can be overwritten by webhook | **UNSAFE.** Add guard in RPC. |
| Webhook regression (DONE→CONFIRMING etc.) | Possible today | **ACCIDENTAL.** Same guard. |
| Admin final state vs webhook | Webhook can override admin final state | Add same guard (final state = no update). |
| Cron regress state | No (only NEW/CONFIRMING selected) | **Safe by design.** |
| Cron override admin | No (final states not in stale list) | **Safe by design.** |
| Invariant: once DONE/FAILED/EXPIRED never leave | Not enforced | Enforce in RPC. |

**Single fix location:** `supabase/migrations/044_webhook_guard_final_states.sql` — replaces `process_webhook_status_update` with a version that, after reading `v_old_internal_status`, checks `IF v_old_internal_status IN ('DONE', 'FAILED', 'EXPIRED') THEN` and returns current order without updating.
