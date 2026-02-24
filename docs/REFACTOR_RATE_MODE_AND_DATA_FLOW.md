# Rate Mode and Exchange Data Flow (Backend-Driven)

This document describes the business definitions and end-to-end data flow after the refactor. **No cosmetic logic:** UI displays backend truth only.

---

## 1. Business Definitions

### Fixed Rate

- **Definition:** Rate is locked at order creation. The provider (NOWPayments) locks the conversion rate for ~20 minutes.
- **User obligation:** User must send **exactly** the amount returned by the provider (`provider_pay_amount` / `pay_amount` from create-payment response).
- **Outcome:** If the user sends the exact amount within the validity window, they receive the quoted amount (minus any provider/network behaviour; we store `expected_receive` and, after completion, `final_receive_amount`).
- **Where shown:** UI (rate-type selector), order page (“Fixed Rate”, “Rate locked”), confirmation email (when we include rate mode).

### Floating Rate

- **Definition:** Rate is **not** locked. Final conversion is calculated after blockchain confirmation.
- **User obligation:** User must send **exactly** the amount returned by the provider (`provider_pay_amount`). The amount they **receive** depends on the rate at confirmation time.
- **Outcome:** Final receive amount may differ from the initial estimate; we store the provider’s actual outcome in `final_receive_amount` (and update `to_amount` from webhook when provided).
- **Where shown:** UI (rate-type selector), order page (“Floating Rate”, “Rate confirmed after 1 confirmation”), confirmation email (when we include rate mode).

---

## 2. Data Flow (Stages)

| Stage | Source of truth | Notes |
|-------|------------------|--------|
| **UI quote** | Backend: `/api/exchange-fees` (fee %), `/api/exchange/limits` (min/max, `is_fixed_rate`), prices for display | Frontend applies fee % from API; no hardcoded fees. |
| **Payment creation** | `POST /api/payment` with `rate_type` → `lib/nowpayments.ts` sends `is_fixed_rate: true \| false` to NOWPayments | Provider locks rate when fixed. |
| **DB storage** | `orders.rate_mode`, `orders.provider_pay_amount`, `orders.provider_rate_locked`, `orders.from_amount` (= provider `pay_amount` when present), `orders.to_amount`, `orders.final_receive_amount` | Amount to send = `provider_pay_amount` ?? `from_amount`. |
| **Order page** | `GET /api/order/[id]` returns `payAmount` (= `providerPayAmount ?? fromAmount`), `outcomeAmount` (= `finalReceiveAmount ?? toAmount`), `rateMode`, `providerRateLocked` | “You must send exactly: {payAmount}”. Rate mode and locked/float description from DB. |
| **Email** | Order data from DB (same as order page) | Use `rate_mode`, amounts, and provider fields when building content. |
| **Webhook** | `process_webhook_status_update` updates status; when payload has `outcome_amount`, updates `final_receive_amount` and `to_amount` | Floating (and fixed) final amounts from provider. |
| **Reconciliation** | Reads order from DB; no recalculation | Uses stored `rate_mode`, `provider_pay_amount`, etc. |

---

## 3. Fee Application

- **Stored:** `exchange_fee_settings` (single row): `fixed_fee_percent`, `floating_fee_percent`.
- **Applied:** Fee is applied to the **receive** side (output): `expected_receive = estimated_from_provider * (1 - fee_percent/100)`.
- **Where:** Backend computes `expectedReceiveBackend` in payment route using `getExchangeFeeSettings()` and `getEstimatedPrice()` + `applyFee()`. Frontend uses fee % from `GET /api/exchange-fees` for display only; backend is source of truth for stored `to_amount` / `expected_receive`.

---

## 4. Amount to Send

- **Canonical value:** `orders.provider_pay_amount` when set (from NOWPayments create-payment response `pay_amount`), else `orders.from_amount`.
- **Order page:** Displays “You must send exactly: {payAmount}” where `payAmount` is the canonical value above.
- **No client-supplied send amount as source of truth:** We store `from_amount` from the provider response when available.

---

## 5. Fixed Rate Expiry

- Provider typically locks fixed rate for ~20 minutes. If the order is still in NEW/AWAITING_DEPOSIT after that, the **order page** can show an expired state (timer/expiration already in place). No separate “rate expired” flag is stored; expiry is implied by order status and timer.

---

## 6. Files Touched (Summary)

- **DB:** `supabase/migrations/051_rate_mode_provider_amounts_fee_settings.sql` (orders columns, `exchange_fee_settings`, RPCs).
- **Backend:** `lib/nowpayments.ts` (is_fixed_rate, pay_amount/outcome_amount), `lib/db-exchange-fees.ts`, `lib/db-orders.ts` (Order type, create order, webhook params), `app/api/payment/route.ts` (fee from DB, is_fixed_rate, provider_pay_amount, rate_mode), `app/api/order/[id]/route.ts` (payAmount, outcomeAmount, rateMode, providerPayAmount, finalReceiveAmount), `app/api/webhook/nowpayments/route.ts` (outcome_amount → final_receive_amount, to_amount), `app/api/exchange-fees/route.ts`, `app/api/admin/exchange-fees/route.ts`.
- **Frontend:** `components/ExchangeWidget.tsx`, `components/ExchangeWidgetNew.tsx` (fetch fee %, labels for network fee/ETA as “est.”), `app/order/[id]/page.tsx` (rate mode, “You must send exactly”, outcomeAmount), `components/OrderInfoQRCard.tsx` (rateMode, providerRateLocked, descriptions).

---

## 7. Flow Diagram

```
┌─────────────┐     GET /api/exchange-fees      ┌──────────────────────┐
│  Exchange   │ ──────────────────────────────►│ fixed_fee_percent,   │
│  Widget     │                                 │ floating_fee_percent │
└──────┬──────┘                                 └──────────────────────┘
       │
       │ POST /api/payment { rate_type, send_amount, price_amount, ... }
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Payment route                                                        │
│  1. getExchangeFeeSettings() → fee %                                  │
│  2. getEstimatedPrice(send, from, to) → raw receive                   │
│  3. expectedReceive = applyFee(raw, fee%)                              │
│  4. createPayment({ ..., is_fixed_rate: rate_type === 'fixed' })      │
│  5. payment.pay_amount → provider_pay_amount, from_amount             │
│  6. createOrderWithHistoryTransaction(rate_mode, provider_pay_amount,  │
│       provider_rate_locked, to_amount = expectedReceive)              │
└──────┬───────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────┐     GET /api/order/[id]      ┌─────────────────┐
│  Order page         │ ◄────────────────────────────│ payAmount,       │
│  "You must send     │                               │ outcomeAmount,  │
│   exactly: X"       │                               │ rateMode,       │
│  Rate locked /      │                               │ providerRate-   │
│  Rate confirmed     │                               │ Locked          │
│  after 1 conf"      │                               └─────────────────┘
└─────────────────────┘

┌─────────────────────┐  IPN (outcome_amount)   ┌─────────────────────┐
│  Webhook            │ ◄───────────────────────│ NOWPayments         │
│  processWebhook-    │                          │ finished/confirming │
│  StatusUpdateAtomic │  final_receive_amount,   │                     │
│  (final_receive_    │  to_amount updated       │                     │
│   amount, to_amount)│ ───────────────────────►│ orders row          │
└─────────────────────┘                          └─────────────────────┘
```
