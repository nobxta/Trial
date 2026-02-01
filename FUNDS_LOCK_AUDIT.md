# Funds Lock After Payment – Audit

**Scope:** Orders in PAYMENT_CONFIRMED, MANUAL_REVIEW, or PROCESSING_BY_PROVIDER where payment is confirmed by the provider but the order cannot reach DONE and no automated or manual path exists to resolve it.

---

## Path 1: Maintenance mode on

**1. Exact internal_status where the system can get stuck**  
PAYMENT_CONFIRMED, MANUAL_REVIEW, PROCESSING_BY_PROVIDER.

**2. Why admin action might be blocked**  
`app/api/admin/orders/[id]/actions/route.ts` calls `requireNotMaintenanceMode()` at line 21 before parsing the body or loading the order. Maintenance mode blocks all admin write operations (including mark_completed, resync, unlock). No exception for funds-release actions.

**3. Can cron fix it?**  
No. `findStaleOrders` in `lib/db-orders.ts` only selects `internal_status IN ('NEW', 'AWAITING_DEPOSIT', 'CONFIRMING')`. Cron never selects PAYMENT_CONFIRMED, MANUAL_REVIEW, or PROCESSING_BY_PROVIDER.

**4. Can webhook replay fix it?**  
No. Webhook idempotency is per `(payment_id, payment_status)`. Replaying the same "finished" webhook returns `already_processed` and does not update the order again.

**5. Verdict**  
**FUND LOCK RISK** if maintenance stays on and no one can turn it off (e.g. separate maintenance toggle that bypasses maintenance, or DB-only toggle).

**6. Code-level fix**  
For actions `mark_completed` and `unlock`, when the order is in PAYMENT_CONFIRMED, MANUAL_REVIEW, or PROCESSING_BY_PROVIDER, skip `requireNotMaintenanceMode()` so funds can be released even during maintenance.

---

## Path 2: Order locked and admin is operator (not super_admin)

**1. Exact internal_status where the system can get stuck**  
PAYMENT_CONFIRMED, MANUAL_REVIEW, PROCESSING_BY_PROVIDER.

**2. Why admin action might be blocked**  
`app/api/admin/orders/[id]/actions/route.ts` lines 45–50: if `currentOrder.locked && admin.role !== 'super_admin'`, the handler returns 403 for every action (including unlock and mark_completed). So an operator cannot unlock or mark_completed when the order is locked. Only super_admin can. If no super_admin is available (days later, leave, etc.), funds stay locked.

**3. Can cron fix it?**  
No. Reconciliation does not include these states.

**4. Can webhook replay fix it?**  
No. Same idempotency as above.

**5. Verdict**  
**FUND LOCK RISK** when order is locked and only operators (no super_admin) are available.

**6. Code-level fix**  
For orders in PAYMENT_CONFIRMED, MANUAL_REVIEW, or PROCESSING_BY_PROVIDER, allow operators to perform `mark_completed` and `unlock` even when the order is locked (funds-release exception). Keep lock enforcement for all other actions and for other states.

---

## Path 3: Stuck in PROCESSING_BY_PROVIDER (or PAYMENT_CONFIRMED/MANUAL_REVIEW) with no more webhooks

**1. Exact internal_status where the system can get stuck**  
PAYMENT_CONFIRMED, MANUAL_REVIEW, PROCESSING_BY_PROVIDER.

**2. Why admin action might be blocked**  
Admin is not blocked per se, but if webhooks stop permanently and admin acts days later or not at all, the only way to move the order is admin resync or mark_completed. Cron never polls these states, so provider status is never re-fetched automatically. If provider has already sent "finished" and we missed the webhook, the order stays in PROCESSING_BY_PROVIDER until an admin runs resync or mark_completed.

**3. Can cron fix it?**  
No. `findStaleOrders` explicitly excludes PAYMENT_CONFIRMED, MANUAL_REVIEW, and PROCESSING_BY_PROVIDER. So no automated path polls the provider for these orders.

**4. Can webhook replay fix it?**  
No. Replaying the same (payment_id, payment_status) is idempotent and does not re-apply.

**5. Verdict**  
**FUND LOCK RISK** when webhooks stop permanently and no admin (or cron) ever runs resync/mark_completed. Risk is mitigated only by admin availability; there is no guaranteed automated resolution.

**6. Code-level fix**  
Extend reconciliation to include orders in PAYMENT_CONFIRMED, MANUAL_REVIEW, and PROCESSING_BY_PROVIDER that have been in that state longer than a threshold (e.g. 60 minutes). Poll provider; if status is finished/success, call `processWebhookStatusUpdateAtomic` with DONE (or with manual-override to PAYMENT_CONFIRMED/MANUAL_REVIEW). For a guaranteed resolution without admin: when reconciling such "paid but not DONE" orders and provider says finished/success, set DONE regardless of payout_mode (stale-order override) so cron can complete the order.

---

## Summary

| Path | Stuck statuses | Block | Cron | Replay | Verdict |
|------|-----------------|-------|------|--------|---------|
| Maintenance on | PAYMENT_CONFIRMED, MANUAL_REVIEW, PROCESSING_BY_PROVIDER | requireNotMaintenanceMode blocks all | No | No | **FUND LOCK RISK** |
| Locked + operator only | Same | locked && role !== super_admin → 403 | No | No | **FUND LOCK RISK** |
| Webhooks stopped | Same | Admin may be absent | No (states not in findStaleOrders) | No | **FUND LOCK RISK** (no guaranteed resolution) |

---

## Fixes applied (code-level)

1. **Maintenance bypass for funds-release** (`app/api/admin/orders/[id]/actions/route.ts`): For `mark_completed` and `unlock`, when order is in PAYMENT_CONFIRMED, MANUAL_REVIEW, or PROCESSING_BY_PROVIDER, `requireNotMaintenanceMode()` is skipped so funds can be released during maintenance.
2. **Lock bypass for funds-release** (same file): For `mark_completed` and `unlock`, when order is in PAYMENT_CONFIRMED, MANUAL_REVIEW, or PROCESSING_BY_PROVIDER, operators (not only super_admin) can perform the action even when the order is locked.
3. **Reconciliation for paid-but-not-DONE** (`lib/db-orders.ts` + `lib/order-reconciliation.ts`): Added `findStalePaidOrders()` and a second pass in `runOrderReconciliation()` for orders in PAYMENT_CONFIRMED, MANUAL_REVIEW, PROCESSING_BY_PROVIDER older than `paidStaleMinutes` (default 60). Cron polls provider; if finished/success, calls `processWebhookStatusUpdateAtomic` with DONE so cron can complete the order without admin (idempotency still applies; if webhook had already been processed, alreadyProcessed and skip).
