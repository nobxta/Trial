# SYSTEM TEST EXECUTION GUIDE

## Prerequisites

1. **Backend Running**
   ```bash
   npm run dev
   # Or your production server
   ```

2. **Database Migration Applied**
   ```sql
   -- Verify migration 028 is applied
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'orders' 
   AND column_name IN ('internal_status', 'user_status', 'provider_status', 'status_source', 'payout_hash');
   ```

3. **Payout Mode Set to Manual**
   ```sql
   -- Check payout mode
   SELECT * FROM exchange_settings WHERE key = 'payout_mode';
   -- Should return: {"mode": "manual"}
   ```

4. **NOWPayments API Configured**
   - Sandbox/test environment
   - IPN secret configured
   - Webhook URL: `https://your-domain.com/api/webhook/nowpayments`

5. **Admin User Exists**
   - Access to `/admin/orders`
   - Operator or higher role

---

## TEST 1: HAPPY PATH — MANUAL PAYOUT

### Step 1: Create Order as User

**Action:**
1. Open frontend exchange widget
2. Select currencies (e.g., BTC → USDT)
3. Enter amount (minimum required)
4. Enter destination address
5. Click "Exchange Now"

**Verify in Database:**
```sql
SELECT 
  order_id,
  payment_id,
  internal_status,
  user_status,
  status_source,
  from_currency,
  from_amount,
  to_currency,
  to_amount
FROM orders
WHERE order_id = '<ORDER_ID>'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- `internal_status = 'NEW'`
- `user_status = 'Waiting for payment'`
- `status_source = 'system'`
- `payment_id` is set (from NOWPayments)

**✅ PASS / ❌ FAIL:** _______________

---

### Step 2: Send Real Test Payment

**Action:**
1. Copy deposit address from order page
2. Send actual test payment to that address
3. Wait for blockchain confirmation

**Payment Details:**
- Address: _______________
- Amount: _______________
- TX Hash: _______________

**Status:** [ ] Payment sent / [ ] Payment confirmed

---

### Step 3: Wait for Webhook

**Action:**
1. Monitor webhook logs
2. Check database after webhook

**Verify Webhook Received:**
- Check server logs for webhook receipt
- Check `/api/webhook/nowpayments` endpoint logs

**Verify Database After Webhook:**
```sql
SELECT 
  order_id,
  internal_status,
  user_status,
  provider_status,
  status_source,
  payin_hash
FROM orders
WHERE order_id = '<ORDER_ID>';
```

**Expected:**
- `provider_status = 'confirmed'` (or similar)
- `internal_status = 'PAYMENT_CONFIRMED'`
- `user_status = 'Payment confirmed'`
- `status_source = 'webhook'`
- `payin_hash` is set (if provided by webhook)

**✅ PASS / ❌ FAIL:** _______________

**Issues Found:**
```
_______________
```

---

### Step 4: Admin Panel — Orders List

**Action:**
1. Open `/admin/orders`
2. Find the order in the list

**Expected:**
- Order appears in default list (not hidden)
- Internal status visible: `PAYMENT_CONFIRMED`
- Provider status visible: `confirmed` (or similar)
- User status visible: `Payment confirmed`

**✅ PASS / ❌ FAIL:** _______________

---

### Step 5: Verify Payment (Read-only)

**Action:**
1. Click on order to open details
2. Click "Verify Payment" button
3. Check response (should show comparison)

**Expected:**
- Fetches provider status from NOWPayments API
- Shows comparison:
  - Database internal status
  - Database provider status
  - Current provider status (from API)
  - Status match indicator
- **Database is NOT changed**
- Action logged in admin logs

**Verify Database Unchanged:**
```sql
SELECT 
  internal_status,
  status_source,
  updated_at
FROM orders
WHERE order_id = '<ORDER_ID>';
-- Should be same as before Verify Payment
```

**✅ PASS / ❌ FAIL:** _______________

---

### Step 6: Approve for Manual Payout

**Action:**
1. Click "Approve for Manual Payout" button
2. Enter optional reason
3. Confirm

**Verify Database:**
```sql
SELECT 
  internal_status,
  user_status,
  status_source,
  status_updated_by,
  manual_review_required,
  manual_review_assigned_to,
  manual_review_reason
FROM orders
WHERE order_id = '<ORDER_ID>';
```

**Expected:**
- `internal_status = 'MANUAL_REVIEW'`
- `user_status = 'Processing'`
- `status_source = 'admin'`
- `status_updated_by = <admin_id>`
- `manual_review_required = true`
- `manual_review_assigned_to = <admin_id>`
- `manual_review_reason` is set

**✅ PASS / ❌ FAIL:** _______________

---

### Step 7: Enter Payout TX Hash

**Action:**
1. Click "Enter Payout Hash" button
2. Enter transaction hash: `0x...` or similar
3. Confirm

**Verify Database:**
```sql
SELECT 
  payout_hash,
  payout_hash_entered_by,
  payout_hash_entered_at
FROM orders
WHERE order_id = '<ORDER_ID>';
```

**Expected:**
- `payout_hash` is set
- `payout_hash_entered_by = <admin_id>`
- `payout_hash_entered_at` is set (timestamp)

**✅ PASS / ❌ FAIL:** _______________

---

### Step 8: Mark Completed

**Action:**
1. Click "Mark Completed" button
2. Confirm

**Verify Database:**
```sql
SELECT 
  internal_status,
  user_status,
  status_source,
  status_updated_by
FROM orders
WHERE order_id = '<ORDER_ID>';
```

**Expected:**
- `internal_status = 'DONE'`
- `user_status = 'Completed'`
- `status_source = 'admin'`
- `status_updated_by = <admin_id>`

**✅ PASS / ❌ FAIL:** _______________

---

### Step 9: Test Webhook Override Protection

**Action:**
1. Simulate webhook with `finished` status
2. Send POST to `/api/webhook/nowpayments` with:
   ```json
   {
     "payment_id": "<PAYMENT_ID>",
     "payment_status": "finished",
     "order_id": "<ORDER_ID>"
   }
   ```

**Verify Database After Webhook:**
```sql
SELECT 
  internal_status,
  status_source
FROM orders
WHERE order_id = '<ORDER_ID>';
```

**Expected:**
- `internal_status` remains `DONE` (NOT changed)
- `status_source` remains `admin` (NOT changed to `webhook`)
- Webhook is blocked by admin override protection

**✅ PASS / ❌ FAIL:** _______________

**Issues Found:**
```
_______________
```

---

## TEST 2: SPAM / UNPAID ORDERS

### Step 1: Create Multiple Unpaid Orders

**Action:**
1. Create 3 orders via frontend
2. Do NOT send any payment

**Order IDs:**
1. _______________
2. _______________
3. _______________

**Verify Database:**
```sql
SELECT 
  order_id,
  internal_status,
  user_status
FROM orders
WHERE order_id IN ('<ID1>', '<ID2>', '<ID3>');
```

**Expected:**
- All have `internal_status = 'NEW'` or `'AWAITING_DEPOSIT'`
- All have `user_status = 'Waiting for payment'`

**✅ PASS / ❌ FAIL:** _______________

---

### Step 2: Admin Orders Page — Default View

**Action:**
1. Open `/admin/orders` (no filters)
2. Check if unpaid orders appear

**Expected:**
- Unpaid orders do NOT appear in default list
- Only orders with `PAYMENT_CONFIRMED`, `MANUAL_REVIEW`, etc. shown
- No spam orders visible

**✅ PASS / ❌ FAIL:** _______________

---

### Step 3: Show Unpaid Filter

**Action:**
1. Add `?showUnpaid=true` to URL
2. Check if unpaid orders now appear

**Expected:**
- Unpaid orders now visible
- Status clearly shows `NEW` or `AWAITING_DEPOSIT`

**✅ PASS / ❌ FAIL:** _______________

---

## TEST 3: PROVIDER MISMATCH

### Step 1: Create Order and Send Payment

**Action:**
1. Create order
2. Send payment
3. Wait for webhook

**Order ID:** _______________
**Payment ID:** _______________

---

### Step 2: Force Provider Mismatch

**Action:**
1. Manually change database status (via SQL or admin)
2. Set `internal_status = 'PAYMENT_CONFIRMED'`
3. Set `provider_status = 'confirmed'`

**Database Before:**
```sql
SELECT internal_status, provider_status
FROM orders WHERE order_id = '<ORDER_ID>';
```

---

### Step 3: Verify Payment Shows Mismatch

**Action:**
1. Click "Verify Payment" in admin
2. Check response

**Expected:**
- Shows provider status from API (may be different)
- Shows database status
- Shows mismatch indicator if different
- Database is NOT auto-updated
- Admin must manually decide

**✅ PASS / ❌ FAIL:** _______________

---

## TEST 4: ADMIN OVERRIDE DOMINANCE

### Step 1: Mark Order as FAILED

**Action:**
1. Find an order in `PAYMENT_CONFIRMED` status
2. Click "Mark as Failed"
3. Enter reason

**Order ID:** _______________

**Verify Database:**
```sql
SELECT 
  internal_status,
  user_status,
  status_source,
  status_updated_by
FROM orders
WHERE order_id = '<ORDER_ID>';
```

**Expected:**
- `internal_status = 'FAILED'`
- `user_status = 'Failed'`
- `status_source = 'admin'`
- `status_updated_by = <admin_id>`

**✅ PASS / ❌ FAIL:** _______________

---

### Step 2: Simulate Provider Webhook Retry

**Action:**
1. Send webhook with `finished` status:
   ```bash
   curl -X POST https://your-domain.com/api/webhook/nowpayments \
     -H "Content-Type: application/json" \
     -H "x-nowpayments-sig: <signature>" \
     -d '{
       "payment_id": "<PAYMENT_ID>",
       "payment_status": "finished",
       "order_id": "<ORDER_ID>"
     }'
   ```

**Verify Database After Webhook:**
```sql
SELECT 
  internal_status,
  status_source
FROM orders
WHERE order_id = '<ORDER_ID>';
```

**Expected:**
- `internal_status` remains `FAILED` (NOT changed)
- `status_source` remains `admin` (NOT changed)
- Webhook does NOT override admin decision

**✅ PASS / ❌ FAIL:** _______________

**Issues Found:**
```
_______________
```

---

## TEST 5: USER UI SAFETY

### Step 1: Open User Order Page

**Action:**
1. Navigate to `/order/<ORDER_ID>`
2. Open browser DevTools → Network tab

**Order ID:** _______________

---

### Step 2: Verify API Endpoint

**Check Network Tab:**
- Should see: `GET /api/order/<ORDER_ID>`
- Should NOT see: Direct calls to NOWPayments API
- Should NOT see: Provider status in response

**✅ PASS / ❌ FAIL:** _______________

---

### Step 3: Verify Status Display

**Check Page Content:**
- Look for status text on page

**Allowed Statuses (ONLY these):**
- ✅ "Waiting for payment"
- ✅ "Payment confirmed"
- ✅ "Processing"
- ✅ "Completed"
- ✅ "Failed"
- ✅ "Expired"

**Forbidden Statuses (MUST NOT appear):**
- ❌ "Perform exchange"
- ❌ "Converting funds"
- ❌ "Network confirmation"
- ❌ Internal statuses (NEW, PAYMENT_CONFIRMED, etc.)
- ❌ Provider statuses (waiting, confirming, etc.)

**Status Shown:** _______________
**Forbidden Terms Found:** [ ] Yes / [ ] No

**✅ PASS / ❌ FAIL:** _______________

---

### Step 4: Verify Progress Steps

**Check Progress Timeline:**
- Should show steps: Waiting → Confirmed → Processing → Completed
- Should NOT show: "Perform exchange", "Converting funds"

**Steps Shown:** _______________

**✅ PASS / ❌ FAIL:** _______________

---

## TEST SUMMARY

### Results
- **TEST 1 (Happy Path):** [ ] PASS / [ ] FAIL
- **TEST 2 (Spam Orders):** [ ] PASS / [ ] FAIL
- **TEST 3 (Provider Mismatch):** [ ] PASS / [ ] FAIL
- **TEST 4 (Admin Override):** [ ] PASS / [ ] FAIL
- **TEST 5 (User UI Safety):** [ ] PASS / [ ] FAIL

### Critical Issues
```
_______________
_______________
```

### Files Modified (if any)
1. _______________
2. _______________
3. _______________

---

## AUTOMATED TEST SCRIPT

You can also run the automated test script:

```bash
npx tsx scripts/run-system-tests.ts
```

This will:
- Check migration 028
- Check payout mode
- Verify order statuses
- Check unpaid orders filter
- Check admin override protection
- Check user status mapping

Results will be saved to `test-results.json`.

---

**Test Completed:** [ ] Yes
**All Tests Pass:** [ ] Yes / [ ] No
**Ready for Production:** [ ] Yes / [ ] No

