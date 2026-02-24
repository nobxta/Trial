# Crypto Selection and Exchange Rate Logic — Technical Audit

Backend-level audit of fixed/floating rate, fee breakdown, network fee, ETA, order amounts, and payment creation payload. **Brutally honest** about what is real vs cosmetic.

---

## 1. Fixed Rate vs Floating Rate — Does It Actually Work?

### Is the rate mode passed to NOWPayments API at payment creation?

**No.** The rate mode (fixed vs floating) is **not** sent to NOWPayments when creating a payment.

| Question | Answer |
|----------|--------|
| Passed to NOWPayments at payment creation? | **No** |
| API parameter that would control it? | `is_fixed_rate` (NOWPayments supports it; we do **not** send it) |
| Does it lock the rate on provider side (Fixed)? | **No** — we never send `is_fixed_rate`, so the provider does not lock the rate for our payments |
| Is it only visual? | **Yes.** Fixed vs Float only affects: (1) which **min-amount** limits we fetch, (2) frontend fee % (1% vs 0.5%), (3) frontend “locked” rate display. Backend payment creation is identical for both. |

### Where in the codebase is the rate mode handled?

| Location | What happens |
|----------|----------------|
| **`lib/nowpayments.ts`** | `createPayment()` — **does not** accept or send `is_fixed_rate`. Payload has no rate-mode field. |
| **`lib/nowpayments.ts`** | `getExchangeLimits()` — **does** send `is_fixed_rate` to the **min-amount** API only (line 354–360). Used for min/max limits per pair, not for payment creation. |
| **`app/api/payment/route.ts`** | Reads `body.rate_type === 'fixed'` only to choose **limits** (fixed vs floating) for validation (lines 61–65). Does **not** pass rate type to `createPayment()`. |
| **`app/api/exchange/limits/route.ts`** | GET accepts `is_fixed_rate` and passes it to `getExchangeLimitsWithFallback()` so UI/backend use the same limits for the selected mode. |
| **`components/ExchangeWidget.tsx`** | `orderType` (fixed/float) drives: fee % (1 vs 0.5), limits fetch `is_fixed_rate`, and “locked” rate when switching to fixed (lines 406–412, 419–421, 459). |
| **`components/ExchangeWidgetNew.tsx`** | Same pattern: fixed/float only affects limits and fee % and display. |

**Conclusion:** Fixed vs Floating is **cosmetic and limits-only**. The NOWPayments create-payment call is the same for both; the provider does **not** lock the rate for our orders. To get real fixed rate on the provider side, we would need to add `is_fixed_rate: true` (or false) to the create-payment payload in `lib/nowpayments.ts` and pass it from `app/api/payment/route.ts`.

---

### Is the percentage (1% / 0.5%) configurable from admin?

**No.** It is **hardcoded** in the frontend.

| Detail | Where |
|--------|--------|
| **Fixed rate fee** | `components/ExchangeWidget.tsx` line 289: `const fixedRateFee = 1.0;` |
| **Floating rate fee** | `components/ExchangeWidget.tsx` line 290: `const floatRateFee = 0.5;` |
| **ExchangeWidgetNew** | Same: lines 95–96 in `ExchangeWidgetNew.tsx` |

There is **no** DB column or admin API that updates these values. The `fee_percent` in the DB (`orders` table and exchange-pair tables in migrations) is **not** used to drive the widget’s 1% / 0.5%. The API does store `body.fee_percent` in the **response** metadata (e.g. `app/api/payment/route.ts` line 214) for the client, but the client never reads it for display — it uses the hardcoded constants. Admin rate/fee editors (`RatesFeesEditor.tsx`, `app/api/admin/rates/route.ts`) apply to **exchange pairs** (e.g. per-route fee), not to the global “Fixed 1% / Float 0.5%” labels in the widget.

---

## 2. Fee Breakdown — What Is That 1%?

### What do the percentages represent?

The **1% (Fixed) and 0.5% (Floating)** are **our platform markup**: they **reduce the amount the user receives**. They are **not** NOWPayments’ exchange fee and **not** combined with the provider in any shared field — we apply them in the UI only.

| Question | Answer |
|----------|--------|
| Our platform markup? | **Yes** — applied in frontend (and reflected in `expected_receive` sent to backend). |
| NOWPayments exchange fee? | **No** — we don’t display or compute their fee separately. |
| Combined fee? | **No** — only our % is shown and used. |
| Just display? | **No** — it affects the **calculated receive amount** and the value we send as `expected_receive`. |

### Does this percentage increase send amount or reduce receive amount?

It **reduces the amount the user receives**. It does **not** change the amount the user sends.

- **Formula (frontend):** `lib/pricing.ts` — `applyFee(amount, feePercent)` → `amount * (1 - feePercent / 100)`.
- **Usage:** `receiveAmount = applyFee(sendAmount * exchangeRate, feePercent)` (e.g. `ExchangeWidget.tsx` lines 420–421).

So: **input amount** = user send amount; **raw receive** = `sendAmount * exchangeRate`; **after fee** = that value × (1 − fee/100). The fee is taken from the receive side.

### Exact calculation formula

- **Input:** `sendAmount` (crypto user sends), `exchangeRate` (receive per 1 send, from CoinGecko prices), `feePercent` (1 or 0.5).
- **Raw receive (before fee):** `rawReceive = sendAmount * exchangeRate`.
- **After platform fee:** `expectedReceive = rawReceive * (1 - feePercent / 100)`.
- **Backend:** We send `price_amount` = USD value of **send** amount (e.g. `sendUsd`). NOWPayments uses that and their own rate/fees to convert; we do **not** send our fee % to the provider. So:
  - **Our side:** User sends X; we show and store “you get” = X × rate × (1 − fee%).
  - **Provider side:** They receive X (in crypto), convert at their rate, and send the outcome to the user. Their fee is inside their conversion; we don’t pass our 1%/0.5% to them.

### Example: 0.00011362 BTC → 0.00387303 ETH

- **Assumption:** BTC = $68,162, ETH = $1,979.
- **Rate (receive per 1 send):** 68,162 / 1,979 ≈ 34.414 ETH per BTC.
- **Raw receive:** 0.00011362 × 34.414 ≈ 0.003911 ETH.
- **With 1% fee:** 0.003911 × 0.99 ≈ 0.003874; with 0.5%: 0.003911 × 0.995 ≈ 0.003893.
- So **0.00387303 ETH** is consistent with **our** rate (CoinGecko) and **our** fee (1% or a slight rounding). The **locked rate** is only on our UI; NOWPayments does not get a “fixed rate” flag, so their conversion is at their prevailing rate at execution time.

---

## 3. Network Fee — What Does “~ $3.00” Mean?

### What is it?

**Frontend-only static estimate.** It is **not** from an API and **not** the actual blockchain or NOWPayments fee for the payout.

| Question | Answer |
|----------|--------|
| Blockchain gas for payout? | **No** — we don’t fetch chain gas. |
| NOWPayments internal estimate? | **No** — we don’t call any endpoint for it. |
| Provider fee? | **No.** |
| Frontend estimation? | **Yes** — hardcoded per network. |

### Where does the number come from?

**Static map in the widget.** Same in `ExchangeWidget.tsx` and `ExchangeWidgetNew.tsx`:

**File:** `components/ExchangeWidget.tsx` (lines 79–88), `ExchangeWidgetNew.tsx` (lines 15–24)

```ts
const getNetworkFee = (network: Network): number => {
  const chain = network.chain.toUpperCase();
  if (chain === 'BTC' || chain === 'LTC') return 4.50;
  if (chain === 'ERC20' || chain === 'ETH') return 3.00;
  if (chain === 'TRC20') return 1.00;
  if (chain === 'BEP20' || chain === 'BNB') return 0.50;
  if (chain === 'SOL') return 0.05;
  if (chain === 'POLYGON' || chain === 'MATIC') return 0.10;
  if (chain === 'TON') return 0.05;
  return 2.00;
};
```

So “~ $3.00” for ETH/ERC20 is **not** deducted anywhere and **not** from the provider; it’s a **cosmetic** estimate based on receive network only. It is **not** recalculated dynamically per network from any API.

---

## 4. ETA ~ 20 mins — Real or Decorative?

**Decorative.** Not from NOWPayments and not from blockchain confirmation data.

| Question | Answer |
|----------|--------|
| Returned by NOWPayments API? | **No** |
| Hardcoded? | **Yes** — by network “speed” bucket |
| From blockchain confirmation time? | **No** |
| From provider processing time? | **No** |

**Source:** `ExchangeWidget.tsx` (lines 91–103), `ExchangeWidgetNew.tsx` (lines 27–39):

```ts
const getETA = (sendNetwork: Network, receiveNetwork: Network): string => {
  const fastNetworks = ['SOL', 'POLYGON', 'MATIC', 'TON'];
  const mediumNetworks = ['TRC20', 'BEP20', 'BNB'];
  const sendChain = sendNetwork.chain.toUpperCase();
  const receiveChain = receiveNetwork.chain.toUpperCase();
  const isFast = fastNetworks.includes(sendChain) || fastNetworks.includes(receiveChain);
  const isMedium = mediumNetworks.includes(sendChain) || mediumNetworks.includes(receiveChain);
  if (isFast) return '~ 5 mins';
  if (isMedium) return '~ 10 mins';
  return '~ 20 mins';
};
```

So ETA is **purely UI** and differs only by our hardcoded buckets (fast / medium / default), not by actual BTC vs ETH vs USDT TRC20 from any API.

---

## 5. Order Page — What Is Actually Enforced?

### Exact amount user must send

- **Stored in DB:** `orders.from_amount` (and we also have `orders.to_amount` for receive).
- **Source of that value:** The amount the **frontend** sent in the create-payment request: `body.send_amount` (see `app/api/payment/route.ts` line 41 and `orderData.fromAmount: sendAmount` at 180). So the “amount to send” on the order page is **our** value (user input × validation), **not** the provider’s `pay_amount` from the create-payment response.
- **Order page display:** `app/order/[id]/page.tsx` uses `order.payAmount` → from API `apiOrder.payAmount ?? apiOrder.fromAmount` → and `GET /api/order/[id]` returns `payAmount: order.fromAmount` (see `app/api/order/[id]/route.ts` line 167). So the order page shows **DB `from_amount`**, which is the client-supplied send amount, not the provider’s exact required amount.

### Is there tolerance?

- **In our code:** We don’t enforce a numeric tolerance. We validate min/max from exchange limits and then pass `price_amount` (USD) and `pay_currency` to NOWPayments. Under/overpay is handled by **NOWPayments** (e.g. partial payments, statuses). We don’t read or store `pay_amount` from the create-payment response and don’t compare `amount_received` to a tolerance in our logic.

### Underpay / overpay

- **Underpay:** NOWPayments can mark as partially_paid or similar; we don’t have custom underpay handling beyond what the provider reports.
- **Overpay:** Same — provider-driven; we don’t adjust amounts or show overpay logic in the order page.

### Is “amount to send” from the provider (pay_amount)?

**No.** We **do not** use the provider’s `pay_amount` (exact crypto amount to send) from the create-payment response. We store and show `from_amount` = `body.send_amount`. So the frontend shows the **exact value we sent to the backend**, not necessarily the exact amount NOWPayments expects (which could differ slightly due to their rate and rounding). If the API response includes `pay_amount`, we don’t persist or display it.

---

## 6. Full Payment Creation Payload (NOWPayments)

**File:** `lib/nowpayments.ts` → `createPayment()`

**Payload actually sent (exchange flow):**

```ts
// Built from params (lines 129–145)
{
  price_amount: params.price_amount,       // USD value of send amount
  price_currency: params.price_currency,   // 'usd'
  pay_currency: params.pay_currency,       // e.g. 'btc', 'eth'
  order_id: params.order_id,
  order_description: params.order_description,
  ipn_callback_url: params.ipn_callback_url,
  payout_address: params.payout_address,  // if automatic payout
  payout_currency: params.payout_currency, // if automatic payout
  // case: only in sandbox
}
```

**What is NOT in the payload:**

- `is_fixed_rate` — **not sent** (so fixed rate is not requested on the provider).
- Any fee_percent or our 1%/0.5% — **not sent**.

**Where values come from (exchange):** `app/api/payment/route.ts`

| Field | Source | Meaning |
|-------|--------|--------|
| `price_amount` | `body.price_amount ?? body.expected_receive` then validated; in practice frontend sends USD value of send amount | USD value of what user sends |
| `price_currency` | `body.price_currency \|\| 'usd'` | Always `'usd'` in exchange flow |
| `pay_currency` | `body.send_asset` (lowercase) | Crypto user sends (e.g. btc, eth) |
| `order_id` | `body.order_id` | Client-generated order id |
| `order_description` | `body.order_description` or default string | Description text |
| `ipn_callback_url` | `getPublicBaseUrl() + '/api/webhook/nowpayments'` | Webhook URL |
| `payout_address` | `body.destination` | Only if payout mode is automatic |
| `payout_currency` | `body.receive_asset` (lowercase) | Only if payout mode is automatic |
| `case` | Sandbox only | For sandbox test scenarios |

So: **no** fixed-rate flag, **no** fee settings — only amount (USD), currencies, payout address/currency when automatic, and IPN.

---

## 7. Final Table — Real Backend vs Cosmetic

| UI Element | Real Backend Logic? | Or Cosmetic? |
|------------|---------------------|-------------|
| **Fixed Rate %** | Backend uses it only to choose **limits** (fixed vs float). **Not** sent to NOWPayments; rate is **not** locked on provider. | **Cosmetic** for rate lock; **real** only for min/max limits and our fee % in UI. |
| **Floating Rate %** | Same as above. | **Cosmetic** for provider; **real** for limits and our fee % in UI. |
| **Network Fee** | Not used in any backend calculation or API. | **Cosmetic.** |
| **ETA** | Not from API or chain. | **Cosmetic.** |
| **Rate Locked** | We never send `is_fixed_rate` to create payment. | **Cosmetic** (provider does not lock). |
| **You Send** | Stored in DB as `from_amount`; comes from client. Not overwritten by provider’s `pay_amount`. | **Real** (we enforce and show it), but **not** the provider’s exact required amount if they return one. |
| **You Get** | Stored as `to_amount` / `expected_receive` from client calculation (with our fee %). Provider does conversion on their side; we don’t pass our fee to them. | **Real** as our commitment in UI/DB; provider’s actual payout is according to **their** rate and fees. |

---

## Summary

- **Fixed vs Float:** Only affects which **limits** we fetch and what **fee %** we apply in the UI (1% vs 0.5%). **No** `is_fixed_rate` is sent to NOWPayments, so the provider **does not** lock the rate.
- **1% / 0.5%:** **Hardcoded** in the widgets; **not** configurable from admin. Represents **our** markup (reduces receive amount). **Not** sent to the provider.
- **Network fee:** **Static** per-network values in the frontend; **cosmetic**.
- **ETA:** **Static** buckets (5 / 10 / 20 mins); **cosmetic**.
- **Amount to send:** **Real** (we store and show it) but sourced from **our** request (`from_amount`), not from the provider’s `pay_amount`.
- **Payment payload:** Contains price (USD), pay/payout currencies, payout address when automatic, IPN URL. **No** rate mode or fee parameters.

To make “Fixed Rate” real on the provider side, add `is_fixed_rate` to the create-payment request in `lib/nowpayments.ts` and pass the selected rate type from the payment route. To make the 1%/0.5% configurable, you’d need a single source of truth (e.g. DB or env) and to use it in both the API and the widgets instead of hardcoded constants.
