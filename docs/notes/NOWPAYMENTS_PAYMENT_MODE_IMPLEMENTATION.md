# NOWPayments Payment Mode Implementation

## Overview

This document describes the production-grade NOWPayments integration that supports both **LIVE** (real) and **SANDBOX** (test) payment modes with a single admin-controlled toggle.

## Implementation Summary

### ✅ Phase 1: Audit (Completed)

**Findings:**
- NOWPayments integration was using hardcoded URLs and single API key
- No sandbox/live mode separation
- Webhook handler existed but used single IPN secret
- Payment creation in `app/api/payment/route.ts`
- Database had `payment_id` but no `purchase_id` or `payment_mode` tracking

### ✅ Phase 2: Payment Mode System (Completed)

**Database Changes:**
- Added `payment_mode` column to `orders` table (`live` | `sandbox`)
- Added `purchase_id` column for tracking NOWPayments purchase_id
- Added `sandbox_case` column for sandbox test scenarios
- Created `payment_mode` setting in `exchange_settings` table

**Library:**
- Created `lib/payment-mode.ts` - Similar to `payout-mode.ts` for managing payment mode
- Functions: `getPaymentMode()`, `setPaymentMode()`, `isSandboxMode()`, `isLiveMode()`

### ✅ Phase 3: Environment & Config (Completed)

**Environment Variables:**
- `NOWPAYMENTS_API_KEY_LIVE` - Live API key
- `NOWPAYMENTS_API_KEY_SANDBOX` - Sandbox API key
- `NOWPAYMENTS_IPN_SECRET_LIVE` - Live IPN secret
- `NOWPAYMENTS_IPN_SECRET_SANDBOX` - Sandbox IPN secret

**Legacy Support:**
- `NOWPAYMENTS_API_KEY` (falls back to live mode)
- `NOWPAYMENTS_IPN_SECRET` (falls back to live mode)
- `NOWPAYMENTS_API_URL` (defaults to `https://api.nowpayments.io/v1`)

**Config Resolver:**
- Created `lib/nowpayments-config.ts` with `getNowPaymentsConfig()`
- Returns: `{ apiKey, baseUrl, ipnSecret, mode }`
- Automatically selects correct credentials based on current payment mode

### ✅ Phase 4: Payment Creation (Completed)

**Refactored `lib/nowpayments.ts`:**
- All functions now use `getNowPaymentsConfig()` instead of hardcoded env vars
- `createPayment()` supports `case` parameter for sandbox testing
- `getPaymentStatus()` accepts optional `mode` parameter

**Updated `app/api/payment/route.ts`:**
- Gets current payment mode before creating payment
- Saves `payment_mode`, `purchase_id`, and `sandbox_case` to database
- Supports sandbox `case` parameter in request body

### ✅ Phase 5: Webhook Handler (Completed)

**Refactored `app/api/webhook/nowpayments/route.ts`:**
- Detects payment mode from order record
- Selects correct IPN secret based on mode
- Validates signature using mode-specific secret
- Logs payment mode in all webhook events

### ✅ Phase 6: Sandbox Case Support (Completed)

**Sandbox Test Cases:**
- `success` - Payment succeeds
- `failed` - Payment fails
- `expired` - Payment expires
- `partially_paid` - Payment partially paid

**Implementation:**
- `case` parameter added to `PaymentRequest` interface
- Only used in sandbox mode
- Stored in `orders.sandbox_case` column
- Displayed in admin logs

### ✅ Phase 7: Admin UI (Completed)

**Admin Settings Page (`app/admin/settings/page.tsx`):**
- Payment mode toggle (Live / Sandbox)
- Warning banners for each mode
- Environment variable status display
- Separate display for Live and Sandbox credentials

**API Endpoints:**
- `GET /api/admin/settings/payment-mode` - Get current mode
- `POST /api/admin/settings/payment-mode` - Change mode (super_admin only)
- Updated `GET /api/admin/settings/env` - Shows both Live and Sandbox credentials

## Database Migration

**File:** `supabase/migrations/040_add_payment_mode_support.sql`

```sql
-- Add payment_mode column
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_mode TEXT CHECK (payment_mode IN ('live', 'sandbox'));

-- Add purchase_id column
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS purchase_id TEXT;

-- Add sandbox_case column
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS sandbox_case TEXT CHECK (sandbox_case IN ('success', 'failed', 'expired', 'partially_paid'));

-- Create payment_mode setting
INSERT INTO exchange_settings (key, value)
VALUES ('payment_mode', '{"mode": "live"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
```

## Usage

### Setting Payment Mode

**Via Admin UI:**
1. Navigate to `/admin/settings`
2. Find "Payment Mode" section
3. Click "🟢 Live Payments" or "🟡 Sandbox Mode"
4. Confirm the change

**Via API:**
```typescript
import { setPaymentMode } from '@/lib/payment-mode';

await setPaymentMode('sandbox', adminId);
```

### Creating Payments

**Automatic Mode Detection:**
```typescript
import { createPayment } from '@/lib/nowpayments';

// Payment will use current payment mode (from database)
const payment = await createPayment({
  price_amount: 100,
  price_currency: 'usd',
  pay_currency: 'btc',
  // Sandbox-specific (only used in sandbox mode):
  case: 'success', // Optional: 'success', 'failed', 'expired', 'partially_paid'
});
```

### Webhook Handling

Webhooks automatically:
1. Look up order by `payment_id`
2. Determine payment mode from order record
3. Select correct IPN secret
4. Verify signature using mode-specific secret

## Security Features

1. **Mode-Specific Secrets:** Each mode uses its own IPN secret
2. **Signature Verification:** Webhooks are verified using correct secret
3. **Database Source of Truth:** Payment mode stored with each order
4. **No Frontend Exposure:** Payment mode never exposed to frontend
5. **Admin-Only Control:** Only super_admin can change payment mode

## Testing

### Sandbox Mode Testing

1. Switch to Sandbox mode in Admin Panel
2. Create payment with `sandbox_case` parameter:
   ```json
   {
     "price_amount": 100,
     "price_currency": "usd",
     "pay_currency": "btc",
     "sandbox_case": "success"
   }
   ```
3. Payment will simulate the specified scenario
4. Check order record for `payment_mode: 'sandbox'` and `sandbox_case`

### Live Mode

1. Switch to Live mode in Admin Panel
2. Create payment (no `sandbox_case` parameter)
3. Payment will use real NOWPayments API
4. Check order record for `payment_mode: 'live'`

## Migration Notes

### For Existing Deployments

1. **Run Migration:**
   ```bash
   # Migration will add columns and create default setting
   ```

2. **Set Environment Variables:**
   ```env
   # Live mode (required for production)
   NOWPAYMENTS_API_KEY_LIVE=your_live_key
   NOWPAYMENTS_IPN_SECRET_LIVE=your_live_secret
   
   # Sandbox mode (optional, for testing)
   NOWPAYMENTS_API_KEY_SANDBOX=your_sandbox_key
   NOWPAYMENTS_IPN_SECRET_SANDBOX=your_sandbox_secret
   ```

3. **Legacy Support:**
   - Old `NOWPAYMENTS_API_KEY` still works (maps to live mode)
   - Old `NOWPAYMENTS_IPN_SECRET` still works (maps to live mode)
   - Recommended to migrate to new variable names

### For New Deployments

1. Set all environment variables (Live + Sandbox)
2. Run migration
3. Default mode is `live` (production-ready)

## API Endpoints

### Payment Mode Management

- `GET /api/admin/settings/payment-mode` - Get current mode
- `POST /api/admin/settings/payment-mode` - Change mode (requires super_admin)

### Payment Creation

- `POST /api/payment` - Create payment (automatically uses current mode)
  - Optional: `sandbox_case` parameter (only in sandbox mode)

### Webhook

- `POST /api/webhook/nowpayments` - Receives webhooks (auto-detects mode)

## Files Modified/Created

### New Files
- `supabase/migrations/040_add_payment_mode_support.sql`
- `lib/payment-mode.ts`
- `lib/nowpayments-config.ts`
- `app/api/admin/settings/payment-mode/route.ts`
- `NOWPAYMENTS_PAYMENT_MODE_IMPLEMENTATION.md`

### Modified Files
- `lib/nowpayments.ts` - Refactored to use config resolver
- `lib/db-orders.ts` - Added payment mode fields
- `app/api/payment/route.ts` - Saves payment mode and sandbox case
- `app/api/webhook/nowpayments/route.ts` - Detects mode and uses correct secret
- `app/api/admin/settings/env/route.ts` - Shows both Live and Sandbox credentials
- `app/admin/settings/page.tsx` - Added payment mode toggle UI

## Hard Rules Enforced

✅ **No hardcoded URLs** - All URLs come from config resolver  
✅ **No environment leaks to frontend** - Mode only accessible server-side  
✅ **No fake data** - Sandbox uses real NOWPayments sandbox API  
✅ **No duplicate logic** - Single config resolver for all NOWPayments calls  
✅ **Database is source of truth** - Payment mode stored with each order  
✅ **Polling stops when final** - Existing logic preserved  
✅ **Multiple payments per order** - `purchase_id` supported  

## Next Steps

1. **Run Migration:** Execute `040_add_payment_mode_support.sql`
2. **Set Environment Variables:** Add Live and Sandbox credentials
3. **Test Sandbox Mode:** Switch to sandbox and test payment flows
4. **Verify Webhooks:** Ensure webhooks work in both modes
5. **Monitor Logs:** Check webhook logs for payment mode tracking

## Support

For issues or questions:
- Check webhook logs for payment mode information
- Verify environment variables are set correctly
- Ensure migration has been run
- Check admin logs for payment mode changes

