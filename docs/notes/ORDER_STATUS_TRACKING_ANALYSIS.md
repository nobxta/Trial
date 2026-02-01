# Order Status Tracking Analysis

## Current Implementation: **POLLING-BASED** (Not Webhook-Based)

### Summary

After analyzing the codebase, **order status tracking is currently implemented using POLLING, not webhooks**. The documentation mentions webhooks, but no webhook endpoint exists in the codebase.

---

## Current Approach: Frontend Polling

### Where Polling Happens

**Location:** `app/order/[id]/page.tsx`

**Implementation:**
```typescript
// Lines 210-262: Polling every 10 seconds
const pollInterval = setInterval(() => {
  if (paymentData?.payment_id) {
    const currentStatus = paymentData.payment_status?.toLowerCase();
    
    // Stop polling if order is in final state
    if (currentStatus && finalStates.includes(currentStatus)) {
      clearInterval(pollInterval);
      return;
    }

    fetch(`/api/payment?payment_id=${paymentData.payment_id}`)
      .then(res => res.json())
      .then(updated => {
        if (updated) {
          setPaymentData(prev => ({ ...prev, ...updated }));
          // Update localStorage cache
        }
      });
  }
}, 10000); // Poll every 10 seconds
```

### Polling Details

- **Interval:** 10 seconds (10000ms)
- **Endpoint:** `/api/payment?payment_id={payment_id}`
- **Stop Conditions:** Polling stops when order reaches final states:
  - `finished`
  - `success`
  - `failed`
  - `expired`
  - `refunded`

### Backend Polling Endpoints

**1. `/api/payment` (GET) - Lines 243-265 in `app/api/payment/route.ts`**
```typescript
export async function GET(request: NextRequest) {
  const paymentId = searchParams.get('payment_id');
  const payment = await getPaymentStatus(paymentId); // Calls NOWPayments API
  return NextResponse.json(payment);
}
```

**2. `/api/order/[id]` (GET) - `app/api/order/[id]/route.ts`**
- Fetches order from database
- Also calls NOWPayments API to get latest payment status
- Returns combined data

**3. `/api/order/track` (POST) - `app/api/order/track/route.ts`**
- Gets order from database
- Fetches latest status from NOWPayments API
- Maps payment status to order status

---

## Critical Issue: Database Status Not Updated

### Problem

**The database order status is NEVER automatically updated** after initial creation.

**Initial Status Set:**
```typescript
// app/api/payment/route.ts:80-83
await createOrder(userId, {
  orderId: body.order_id || payment.order_id,
  paymentId: payment.payment_id,
  status: 'pending', // ⚠️ Only set once, never updated
  // ...
});
```

**Missing Function:**
- `lib/db-orders.ts` does NOT have an `updateOrder` function
- Order status in database remains `'pending'` forever
- Frontend displays NOWPayments status (fetched via polling), not database status

**Result:** Database and NOWPayments status are out of sync.

---

## Webhook Implementation: **MISSING**

### What Should Exist But Doesn't

**Expected:** Webhook endpoint to receive status updates from NOWPayments  
**Reality:** No webhook endpoint exists in the codebase

**Evidence:**
1. No `/api/webhook` or `/api/ipn` or `/api/callback` endpoint
2. `ipn_callback_url` is passed to NOWPayments but not handled internally
3. Documentation mentions webhooks, but implementation is missing

**Code Reference:**
```typescript
// app/api/payment/route.ts:46-47
if (body.ipn_callback_url) {
  paymentParams.ipn_callback_url = body.ipn_callback_url; // Passed to NOWPayments only
}
```

---

## Recommended Implementation: Webhook-Based Tracking

### What Needs to Be Implemented

#### 1. Create Webhook Endpoint

**File:** `app/api/webhook/nowpayments/route.ts` (or similar)

**Purpose:** Receive status updates from NOWPayments automatically

**Features:**
- Verify webhook signature (security)
- Parse payment status update
- Update database order status
- Send notifications to users

#### 2. Add Database Update Function

**File:** `lib/db-orders.ts`

**Function:** `updateOrderStatus(orderId: string, status: string, paymentData?: any)`

**Purpose:** Update order status in database when webhook received

#### 3. Webhook URL Configuration

**During Order Creation:**
- Set default webhook URL: `${BASE_URL}/api/webhook/nowpayments`
- Or allow custom `ipn_callback_url` per order
- Store webhook URL with order (if needed)

#### 4. Webhook Signature Verification

NOWPayments sends webhooks with signature verification. Must verify:
- `X-Nowpayments-Signature` header
- HMAC-SHA512 verification using webhook secret

---

## Implementation Architecture

### Webhook Flow

```
NOWPayments Payment Status Change
         ↓
    POST /api/webhook/nowpayments
         ↓
1. Verify Webhook Signature ✓
         ↓
2. Extract payment_id & payment_status
         ↓
3. Find Order by payment_id
         ↓
4. Update Order Status in Database
         ↓
5. Map NOWPayments status → Order status
         ↓
6. Send User Notification (optional)
         ↓
7. Return 200 OK to NOWPayments
```

### Status Mapping

Based on `app/api/order/track/route.ts:92-105`:

```typescript
function mapPaymentStatusToOrderStatus(paymentStatus: string): string {
  const statusMap: Record<string, string> = {
    'waiting': 'NEW',
    'confirming': 'CONFIRMING',
    'confirmed': 'PENDING',
    'sending': 'EXCHANGE',
    'partially_paid': 'PENDING',
    'finished': 'DONE',
    'success': 'DONE',
    'failed': 'EXPIRED',
    'expired': 'EXPIRED',
    'refunded': 'EXPIRED'
  };
  return statusMap[paymentStatus] || 'NEW';
}
```

---

## Benefits of Webhook-Based Approach

1. **Real-Time Updates:** Instant status updates vs 10-second polling delay
2. **Reduced API Calls:** No continuous polling, only on-demand requests
3. **Database Sync:** Database always reflects current status
4. **Server Efficiency:** Backend processes updates, not frontend polling
5. **Better Reliability:** NOWPayments ensures delivery (with retries)

---

## Current vs Recommended Comparison

| Aspect | Current (Polling) | Recommended (Webhook) |
|--------|-------------------|----------------------|
| **Update Method** | Frontend polls every 10s | Backend receives webhooks instantly |
| **Database Sync** | ❌ Status never updated | ✅ Status updated automatically |
| **API Calls** | High (every 10s per active order) | Low (only when status changes) |
| **Latency** | Up to 10 seconds delay | Real-time (< 1 second) |
| **Server Load** | High (continuous polling) | Low (event-driven) |
| **Implementation** | ✅ Exists | ❌ Missing (needs implementation) |

---

## Files That Need Changes

### New Files Needed

1. `app/api/webhook/nowpayments/route.ts` - Webhook endpoint
2. (Optional) `lib/webhook-verification.ts` - Webhook signature verification utility

### Files That Need Updates

1. `lib/db-orders.ts` - Add `updateOrderStatus()` function
2. `app/api/payment/route.ts` - Set default webhook URL when creating orders
3. (Optional) `lib/notifications.ts` - Trigger notifications from webhook handler

---

## Summary

**Current State:**
- ✅ Polling-based tracking (frontend polls every 10 seconds)
- ❌ Webhook endpoint does NOT exist
- ❌ Database order status is NOT updated after creation
- ⚠️ Database and NOWPayments status are out of sync

**Recommendation:**
- Implement webhook endpoint (`/api/webhook/nowpayments`)
- Add `updateOrderStatus()` function to `lib/db-orders.ts`
- Configure default webhook URL in order creation
- Keep polling as fallback (for clients that miss webhooks)

**Priority:**
- High - Database sync is critical for order tracking accuracy
- Medium - Webhook implementation improves efficiency and real-time updates

