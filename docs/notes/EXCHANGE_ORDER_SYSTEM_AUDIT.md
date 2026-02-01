# EXCHANGE & ORDER SYSTEM AUDIT
## Critical Issues & Required Rebuild

**Date:** 2024  
**Status:** CRITICAL - System shows fake/misleading states  
**Action Required:** Complete rebuild before production use

---

## EXECUTIVE SUMMARY

The current exchange and order system violates core financial product principles:
- **Frontend invents status** instead of reading from database
- **Fake progress animations** that don't reflect real state
- **Developer language** exposed to users
- **No rate validation** before order creation
- **Admin cannot override** provider assumptions
- **No separation** between internal and user-facing status

**This system is NOT production-ready and will mislead users.**

---

## 1. FAKE / MISLEADING PARTS

### 1.1 Frontend Status Guessing (CRITICAL)

**Location:** `app/order/[id]/page.tsx` lines 310-337

**Problem:**
```typescript
const getCurrentStep = (status: string): number => {
  const statusLower = status?.toLowerCase() || '';
  
  // Frontend is mapping provider statuses to fake steps
  if (['finished', 'success', 'done'].includes(statusLower)) {
    return 3;
  }
  switch (statusLower) {
    case 'waiting': return 0;
    case 'confirming': case 'confirmed': return 1;
    case 'sending': case 'exchange': return 2;
    default: return 0;
  }
};
```

**Issues:**
- Frontend maps NOWPayments statuses (`waiting`, `confirming`, `sending`) directly to UI steps
- No verification that status matches database
- User sees "Perform exchange" step even when system doesn't control exchange
- Status mapping happens in frontend, not backend

**Impact:** Users see progress that may not reflect reality.

---

### 1.2 Fake Progress Timeline

**Location:** `components/ProgressTimeline.tsx` lines 9-14

**Problem:**
```typescript
const steps = [
  { id: 0, label: "Awaiting deposit", icon: Clock },
  { id: 1, label: "Awaiting confirmations", icon: Loader2 },
  { id: 2, label: "Perform exchange", icon: ArrowRight },  // ❌ FAKE
  { id: 3, label: "Done", icon: CheckCircle2 },
];
```

**Issues:**
- Step 2 says "Perform exchange" - implies system performs exchange
- In reality, NOWPayments handles exchange
- User sees animation implying internal engine that doesn't exist
- No indication this is provider-controlled

**Impact:** Misleading UX that implies control the system doesn't have.

---

### 1.3 Frontend Polling Provider Directly

**Location:** `app/order/[id]/page.tsx` lines 210-262

**Problem:**
```typescript
// Frontend polls NOWPayments API directly every 10 seconds
const pollInterval = setInterval(() => {
  fetch(`/api/payment?payment_id=${paymentData.payment_id}`)
    .then(res => res.json())
    .then(updated => {
      setPaymentData(prev => ({ ...prev, ...updated }));
      // Updates UI without database verification
    });
}, 10000);
```

**Issues:**
- Frontend bypasses database
- Updates UI from provider API response
- No server-side validation
- Status can change without webhook
- Creates race conditions between webhook and polling

**Impact:** Frontend shows provider status that may not match database state.

---

### 1.4 Hardcoded Exchange Rate Calculation

**Location:** `components/ExchangeWidget.tsx` lines 236-244

**Problem:**
```typescript
const receiveAmount = useMemo(() => {
  const amount = parseFloat(sendAmount);
  if (isNaN(amount) || amount <= 0 || exchangeRate === null) {
    return "0";
  }
  const feePercent = orderType === "fixed" ? fixedRateFee : floatRateFee;
  const calculated = applyFee(amount * exchangeRate, feePercent);
  return formatPreciseNumber(calculated, 8);
}, [sendAmount, exchangeRate, orderType, fixedRateFee, floatRateFee]);
```

**Issues:**
- Frontend calculates receive amount using CoinGecko prices
- No validation against NOWPayments actual rate
- Rate can be stale or wrong
- User sees amount that provider may reject
- No sanity check before order creation

**Impact:** Users see amounts that may not match what provider will actually give.

---

### 1.5 localStorage as Fallback Source of Truth

**Location:** `app/order/[id]/page.tsx` lines 126-197

**Problem:**
```typescript
// STEP 2: If not in database, try localStorage (fallback)
const savedOrder = localStorage.getItem(`order_${orderId}`);
if (savedOrder) {
  const parsed = JSON.parse(savedOrder);
  setPaymentData(parsed);
  // ... displays order from localStorage
}
```

**Issues:**
- localStorage used as fallback when database fails
- User can see stale/corrupted data
- No expiration on localStorage data
- Can show orders that were never created
- Bypasses database entirely

**Impact:** Users may see fake or outdated orders.

---

## 2. FRONTEND-ONLY LOGIC

### 2.1 Status Mapping in Frontend

**Files:**
- `app/order/[id]/page.tsx` (lines 310-337)
- `app/track-order/page.tsx` (lines 43-52, 190-203)

**Problem:** Frontend maps internal statuses to user-facing labels:
```typescript
// app/track-order/page.tsx
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  NEW: { label: "Waiting for payment", ... },
  PENDING: { label: "Payment received", ... },
  CONFIRMING: { label: "Confirmations in progress", ... },
  EXCHANGE: { label: "Converting funds", ... },  // ❌ Misleading
  DONE: { label: "Completed", ... },
};
```

**Should be:** Server-side mapping function that returns user-friendly status.

---

### 2.2 Progress Step Calculation

**Location:** `app/order/[id]/page.tsx` lines 310-337

**Problem:** Frontend calculates which step to show based on status string matching.

**Should be:** Backend returns `currentStep` number in API response.

---

### 2.3 Rate Locking Logic

**Location:** `components/ExchangeWidget.tsx` lines 222-234

**Problem:** Frontend manages rate locking state:
```typescript
const handleOrderTypeChange = useCallback((newType: "fixed" | "float") => {
  if (newType === "fixed" && liveExchangeRate !== null) {
    setLockedExchangeRate(liveExchangeRate);
  }
  setOrderType(newType);
}, [orderType, liveExchangeRate, lockedExchangeRate]);
```

**Issues:**
- Rate locked in frontend only
- No server-side rate lock
- User can refresh and lose locked rate
- No timestamp validation

**Should be:** Backend locks rate when order type is "fixed" and returns locked rate.

---

## 3. STATUS GUESSING INSTEAD OF VERIFICATION

### 3.1 Order Status from Provider API

**Location:** `app/api/order/[id]/route.ts` lines 29-38

**Problem:**
```typescript
// Fetch latest payment status from NOWPayments if we have payment_id
let paymentData = null;
if (order.paymentId) {
  try {
    paymentData = await getPaymentStatus(order.paymentId);
  } catch (error) {
    console.error('Failed to fetch payment status:', error);
  }
}

// Combine order data with payment data
const response = {
  success: true,
  order: {
    status: paymentData?.payment_status || order.status,  // ❌ Provider overrides DB
    // ...
  },
};
```

**Issues:**
- API returns provider status instead of database status
- Provider status can be stale or wrong
- No verification that provider status matches database
- Admin overrides can be ignored

**Should be:** Always return database status. Provider status is for admin reference only.

---

### 3.2 Webhook Status Mapping

**Location:** `app/api/webhook/nowpayments/route.ts` lines 17-31

**Problem:**
```typescript
function mapPaymentStatusToOrderStatus(paymentStatus: string): string {
  const statusMap: Record<string, string> = {
    'waiting': 'NEW',
    'confirming': 'CONFIRMING',
    'confirmed': 'PENDING',
    'sending': 'EXCHANGE',  // ❌ Implies system controls exchange
    'finished': 'DONE',
    // ...
  };
  return statusMap[paymentStatus?.toLowerCase()] || 'NEW';
}
```

**Issues:**
- Maps `sending` to `EXCHANGE` - implies internal exchange
- No validation that status makes sense
- Automatic mapping without admin review
- In manual mode, still uses provider status

**Should be:** 
- Map to `PROCESSING_BY_PROVIDER` instead of `EXCHANGE`
- In manual mode, stop at `PAYMENT_CONFIRMED` and require admin action

---

### 3.3 No Rate Validation

**Location:** `app/api/payment/route.ts` (order creation)

**Problem:** Order creation accepts frontend-calculated `expected_receive` without validation:
```typescript
await createOrder(userId, {
  orderId: body.order_id || payment.order_id,
  paymentId: payment.payment_id,
  status: 'pending',
  fromCurrency: body.send_asset.toUpperCase(),
  fromAmount: parseFloat(body.send_amount || '0'),
  toCurrency: body.receive_asset.toUpperCase(),
  toAmount: parseFloat(body.expected_receive || '0'),  // ❌ No validation
  // ...
});
```

**Issues:**
- No check that `expected_receive` matches provider rate
- No sanity check (e.g., 15 ETH → 14 BTC is impossible)
- No rate timestamp
- No deviation check

**Should be:** 
- Fetch rate from provider before order creation
- Validate `expected_receive` against provider rate
- Block order if deviation > 5%
- Store `provider_rate`, `expected_receive`, `rate_timestamp` in DB

---

## 4. MISSING ADMIN ACTIONS

### 4.1 No Manual Override for Status

**Current:** Admin can only:
- `mark_completed` (only in manual mode)
- `mark_failed`
- `resync` (polls provider, not true override)

**Missing:**
- `mark_as_manual_review` - Move order to review queue
- `override_status` - Force any status (with audit log)
- `verify_payment` - Re-check provider without changing status
- `set_payout_hash` - Manually enter transaction hash

---

### 4.2 No Payment Verification Button

**Current:** Admin must use "Re-sync Status" which changes status.

**Missing:** 
- "Verify Payment" button that:
  - Fetches latest provider status
  - Shows comparison (DB vs Provider)
  - Does NOT change status automatically
  - Allows admin to decide

---

### 4.3 No Rate Validation Admin View

**Missing:**
- Display of:
  - Frontend-calculated rate
  - Provider rate at order creation
  - Current provider rate
  - Deviation percentage
  - Rate timestamp

**Impact:** Admin cannot detect rate manipulation or errors.

---

### 4.4 No Order Expiration Management

**Current:** Orders expire automatically (hardcoded 15-30 minutes).

**Missing:**
- Admin can extend expiration
- Admin can manually expire orders
- Admin sees expiration countdown
- Auto-expire orders with no payment after X minutes (configurable)

---

## 5. UNSAFE UI TEXT FOR USERS

### 5.1 Developer Language Exposed

**Location:** `components/ProgressTimeline.tsx` line 12
- ❌ "Perform exchange" - implies internal engine

**Location:** `app/track-order/page.tsx` line 47
- ❌ "Converting funds" - implies system converts

**Location:** `components/OrderDetails.tsx` lines 138-143
- ❌ "Then we will convert and send the funds" - implies internal conversion

**Location:** `app/order/[id]/page.tsx` line 351
- ❌ `paymentStatus: paymentData.payment_status` - exposes provider status name

---

### 5.2 Provider Names Exposed

**Location:** Multiple files expose NOWPayments statuses:
- `waiting`, `confirming`, `sending`, `finished` - these are NOWPayments terms

**Should be:** User never sees provider status names.

---

### 5.3 Technical Explanations

**Location:** `components/OrderDetails.tsx` lines 138-143
```typescript
<div className="text-sm text-text-secondary">
  The exchange rate will be fixed after receiving{" "}
  <span className="font-semibold text-text-primary">{confirmationsNeeded} network confirmation{confirmationsNeeded > 1 ? "s" : ""}</span>.
  Then we will convert and send the funds to your destination address.
</div>
```

**Issues:**
- "network confirmation" - too technical
- "we will convert" - implies internal conversion
- No mention that provider handles exchange

**Should be:**
- "Your payment is being confirmed on the blockchain"
- "Once confirmed, your exchange will be processed"
- No mention of internal vs external

---

### 5.4 Status Labels

**Current user-facing labels (from `app/track-order/page.tsx`):**
- ✅ "Waiting for payment" (OK)
- ✅ "Payment received" (OK)
- ❌ "Confirmations in progress" (too technical)
- ❌ "Converting funds" (misleading - implies internal)
- ✅ "Completed" (OK)
- ✅ "Order expired" (OK)

**Should be:**
- "Waiting for payment"
- "Payment confirmed"
- "Processing your exchange"
- "Completed"
- "Failed"
- "Expired"

---

## 6. DATABASE SCHEMA ISSUES

### 6.1 Missing Rate Fields

**Current schema (`supabase/migrations/004_create_orders_table.sql`):**
```sql
CREATE TABLE orders (
  -- ... existing fields ...
  from_amount DECIMAL(20, 8) NOT NULL,
  to_amount DECIMAL(20, 8) NOT NULL,
  -- ❌ Missing: provider_rate
  -- ❌ Missing: expected_receive (validated)
  -- ❌ Missing: rate_timestamp
  -- ❌ Missing: rate_deviation_percent
);
```

**Should add:**
- `provider_rate DECIMAL(20, 8)` - Rate from provider at order creation
- `expected_receive DECIMAL(20, 8)` - Validated receive amount
- `rate_timestamp TIMESTAMP` - When rate was fetched
- `rate_deviation_percent DECIMAL(5, 2)` - Deviation from market rate

---

### 6.2 Missing Status Fields

**Current:** Only `status TEXT NOT NULL DEFAULT 'pending'`

**Missing:**
- `internal_status TEXT` - For admin (NEW, AWAITING_DEPOSIT, etc.)
- `user_status TEXT` - For users (mapped, simplified)
- `status_source TEXT` - 'webhook' | 'admin' | 'system'
- `status_updated_by UUID` - Admin who changed status (if manual)

---

### 6.3 Missing Transaction Hash Fields

**Current:** No fields for transaction hashes

**Missing:**
- `payin_hash TEXT` - Deposit transaction hash
- `payout_hash TEXT` - Payout transaction hash (for manual mode)
- `payout_hash_entered_by UUID` - Admin who entered hash
- `payout_hash_entered_at TIMESTAMP`

---

### 6.4 Missing Manual Review Fields

**Missing:**
- `manual_review_required BOOLEAN DEFAULT false`
- `manual_review_reason TEXT`
- `manual_review_assigned_to UUID` - Admin assigned

---

## 7. CORRECTED ORDER LIFECYCLE

### 7.1 Backend Status Flow (Internal)

```
NEW
  ↓ (webhook: payment detected)
AWAITING_DEPOSIT
  ↓ (webhook: payment received)
CONFIRMING
  ↓ (webhook: confirmations complete)
PAYMENT_CONFIRMED
  ↓
  ├─→ (automatic mode) PROCESSING_BY_PROVIDER
  │     ↓ (webhook: provider finished)
  │   DONE
  │
  └─→ (manual mode) MANUAL_REVIEW
        ↓ (admin: mark completed)
      DONE

FAILED (can occur at any non-final state)
EXPIRED (timeout or admin action)
```

---

### 7.2 Admin View Status Flow

**Admin sees:**
- Full internal status (NEW, AWAITING_DEPOSIT, etc.)
- Provider status (from NOWPayments API)
- Status history with source (webhook/admin/system)
- Rate information (frontend vs provider)
- Transaction hashes
- Manual review queue

**Admin can:**
- Override status (with audit log)
- Verify payment (re-check provider)
- Enter payout hash (manual mode)
- Move to MANUAL_REVIEW
- Mark as FAILED or DONE

---

### 7.3 User View Status Flow

**User sees (mapped, simplified):**
```
"Waiting for payment"
  ↓
"Waiting for confirmation"
  ↓
"Payment confirmed"
  ↓
"Processing your exchange"
  ↓
"Completed"
```

**User NEVER sees:**
- Internal status names (NEW, EXCHANGE, etc.)
- Provider status names (waiting, sending, etc.)
- Technical terms (confirmations, blockchain, etc.)
- Provider names (NOWPayments, etc.)
- Developer language

---

## 8. REQUIRED CHANGES SUMMARY

### 8.1 Backend Changes

1. **Status Mapping Function**
   - Create `lib/status-mapping.ts`
   - Function: `getUserFacingStatus(internalStatus: string): string`
   - Function: `getCurrentStep(internalStatus: string): number`
   - Server-side only

2. **Rate Validation**
   - Before order creation:
     - Fetch rate from provider
     - Validate `expected_receive` against provider rate
     - Block if deviation > 5%
     - Store rate in DB

3. **Status Update Logic**
   - Always update database first
   - Return database status to frontend
   - Provider status is admin-only

4. **Admin Override Endpoint**
   - `POST /api/admin/orders/[id]/override`
   - Allows any status change
   - Requires audit log
   - Bypasses transition checks

5. **Payment Verification Endpoint**
   - `POST /api/admin/orders/[id]/verify`
   - Fetches provider status
   - Returns comparison (DB vs Provider)
   - Does NOT change status

---

### 8.2 Frontend Changes

1. **Remove Status Mapping**
   - Delete all frontend status mapping
   - Use `user_status` from API response
   - Use `current_step` from API response

2. **Remove Progress Calculation**
   - Delete `getCurrentStep()` function
   - Use `currentStep` from API

3. **Remove Provider Polling**
   - Delete frontend polling
   - Poll `/api/order/[id]` instead (which reads from DB)
   - Stop polling when status is final

4. **Remove localStorage Fallback**
   - If order not in DB, show error
   - Do not fall back to localStorage

5. **Update UI Text**
   - Replace "Perform exchange" → "Processing your exchange"
   - Replace "Converting funds" → "Processing your exchange"
   - Remove technical terms
   - Remove provider references

---

### 8.3 Database Changes

1. **Add Rate Fields**
   ```sql
   ALTER TABLE orders ADD COLUMN provider_rate DECIMAL(20, 8);
   ALTER TABLE orders ADD COLUMN expected_receive DECIMAL(20, 8);
   ALTER TABLE orders ADD COLUMN rate_timestamp TIMESTAMP;
   ALTER TABLE orders ADD COLUMN rate_deviation_percent DECIMAL(5, 2);
   ```

2. **Add Status Fields**
   ```sql
   ALTER TABLE orders ADD COLUMN internal_status TEXT;
   ALTER TABLE orders ADD COLUMN user_status TEXT;
   ALTER TABLE orders ADD COLUMN status_source TEXT;
   ALTER TABLE orders ADD COLUMN status_updated_by UUID REFERENCES admin_users(id);
   ```

3. **Add Transaction Hash Fields**
   ```sql
   ALTER TABLE orders ADD COLUMN payin_hash TEXT;
   ALTER TABLE orders ADD COLUMN payout_hash TEXT;
   ALTER TABLE orders ADD COLUMN payout_hash_entered_by UUID REFERENCES admin_users(id);
   ALTER TABLE orders ADD COLUMN payout_hash_entered_at TIMESTAMP;
   ```

4. **Add Manual Review Fields**
   ```sql
   ALTER TABLE orders ADD COLUMN manual_review_required BOOLEAN DEFAULT false;
   ALTER TABLE orders ADD COLUMN manual_review_reason TEXT;
   ALTER TABLE orders ADD COLUMN manual_review_assigned_to UUID REFERENCES admin_users(id);
   ```

---

## 9. FILES REQUIRING CHANGES

### Critical (Must Fix):
1. `app/order/[id]/page.tsx` - Remove status guessing, use API
2. `components/ProgressTimeline.tsx` - Remove fake "Perform exchange" step
3. `app/api/order/[id]/route.ts` - Return DB status, not provider status
4. `app/api/payment/route.ts` - Add rate validation
5. `components/ExchangeWidget.tsx` - Remove rate locking, use backend
6. `app/track-order/page.tsx` - Remove status mapping

### High Priority:
7. `app/api/webhook/nowpayments/route.ts` - Fix status mapping
8. `components/OrderDetails.tsx` - Update UI text
9. `components/admin/OrderDetailPanel.tsx` - Add admin actions
10. `lib/db-orders.ts` - Add status mapping functions

### Medium Priority:
11. `app/api/admin/orders/[id]/actions/route.ts` - Add override endpoint
12. Database migrations - Add missing fields
13. `lib/status-mapping.ts` - New file for status mapping

---

## 10. TESTING REQUIREMENTS

### Before Implementation:
1. ✅ Audit approved
2. ✅ Database schema updated
3. ✅ Status mapping functions tested
4. ✅ Rate validation tested

### After Implementation:
1. Test order creation with invalid rates (should block)
2. Test admin override (should work)
3. Test webhook updates (should not override admin)
4. Test user-facing status (should never show internal names)
5. Test manual mode (should stop at PAYMENT_CONFIRMED)
6. Test automatic mode (should proceed to DONE)

---

## CONCLUSION

**Current State:** System is NOT production-ready. It shows fake states, uses frontend logic, and exposes developer language.

**Required Action:** Complete rebuild following this audit. No shortcuts.

**Timeline:** This is a critical fix. Do not deploy to production until complete.

---

**END OF AUDIT**

