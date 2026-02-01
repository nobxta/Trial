# Webhook-Based Order Status Tracking - Implementation Summary

## ✅ Implementation Complete

A webhook-based order status tracking system has been implemented to automatically update order statuses in the database when NOWPayments sends payment status updates.

---

## What Was Implemented

### 1. Database Functions (`lib/db-orders.ts`)

**Added Functions:**
- `getOrderByPaymentId(paymentId: string)` - Finds order by payment_id (needed for webhook processing)
- `updateOrderStatus(orderId, status, paymentData?)` - Updates order status in database

### 2. Webhook Endpoint (`app/api/webhook/nowpayments/route.ts`)

**New Endpoint:** `POST /api/webhook/nowpayments`

**Features:**
- ✅ Receives payment status updates from NOWPayments via IPN (Instant Payment Notifications)
- ✅ Verifies webhook signature using HMAC SHA-512 (security)
- ✅ Maps NOWPayments payment status to internal order status
- ✅ Updates order status in database automatically
- ✅ Sends user notifications for important status changes
- ✅ Returns proper HTTP responses to NOWPayments

**Status Mapping:**
- `waiting` → `NEW`
- `confirming` → `CONFIRMING`
- `confirmed` → `PENDING`
- `sending` → `EXCHANGE`
- `partially_paid` → `PENDING`
- `finished` → `DONE`
- `success` → `DONE`
- `failed` → `EXPIRED`
- `expired` → `EXPIRED`
- `refunded` → `EXPIRED`

### 3. Order Creation Updates (`app/api/payment/route.ts`)

**Changes:**
- Automatically sets default webhook URL (`/api/webhook/nowpayments`) when creating orders
- Allows custom `ipn_callback_url` to override default
- Webhook URL is constructed from `NEXT_PUBLIC_APP_URL` or Vercel environment

---

## Configuration Required

### Environment Variables

Add the following to your `.env.local` file:

```env
# NOWPayments IPN Secret (for webhook signature verification)
# Get this from: NOWPayments Dashboard → Settings → Payments → IPN Settings
NOWPAYMENTS_IPN_SECRET=your_ipn_secret_key_here

# App URL (for webhook URL construction)
NEXT_PUBLIC_APP_URL=https://your-domain.com
# Or it will auto-detect from VERCEL_URL if deployed on Vercel
```

**How to Get IPN Secret:**
1. Log in to [NOWPayments Dashboard](https://nowpayments.io/)
2. Go to **Settings** → **Payments** → **Instant Payment Notifications (IPN)**
3. Generate or copy your IPN Secret Key
4. Add it to `.env.local` as `NOWPAYMENTS_IPN_SECRET`

### Important Notes

- **Development:** Webhook signature verification is optional (warning only)
- **Production:** Webhook signature verification is **REQUIRED** - endpoint will reject requests if `NOWPAYMENTS_IPN_SECRET` is not configured
- **Webhook URL:** Must be publicly accessible (HTTPS in production)

---

## How It Works

### Webhook Flow

```
1. NOWPayments Payment Status Changes
         ↓
2. NOWPayments sends POST request to /api/webhook/nowpayments
         ↓
3. Webhook endpoint verifies signature (HMAC SHA-512)
         ↓
4. Extracts payment_id and payment_status from payload
         ↓
5. Finds order in database using payment_id
         ↓
6. Maps NOWPayments status → Internal order status
         ↓
7. Updates order status in database
         ↓
8. Sends user notification (for important statuses)
         ↓
9. Returns 200 OK to NOWPayments
```

### Automatic Webhook URL Setup

When creating an order:
- If `ipn_callback_url` is provided → uses that URL
- If not provided → automatically sets to `${BASE_URL}/api/webhook/nowpayments`
- Base URL is determined from:
  1. `NEXT_PUBLIC_APP_URL` environment variable (preferred)
  2. `VERCEL_URL` (if deployed on Vercel)
  3. `http://localhost:3000` (development fallback)

---

## Testing

### Manual Testing

1. **Create a test order** via `/api/payment` endpoint
2. **Check webhook URL** - verify it's set correctly in NOWPayments response
3. **Use NOWPayments test webhook** (if available) or wait for real payment status change
4. **Verify database update** - check that order status updates automatically
5. **Check logs** - webhook processing logs will show status updates

### Webhook Signature Verification

The webhook endpoint verifies signatures using:
- **Algorithm:** HMAC SHA-512
- **Header:** `x-nowpayments-sig` (or `x-nowpayments-signature`, `signature`)
- **Secret:** `NOWPAYMENTS_IPN_SECRET` environment variable
- **Method:** Timing-safe comparison (prevents timing attacks)

---

## Benefits

✅ **Real-Time Updates:** Order status updates instantly (vs 10-second polling delay)  
✅ **Database Sync:** Database always reflects current order status  
✅ **Reduced API Calls:** No continuous polling - only updates when status changes  
✅ **Server Efficiency:** Backend processes updates, not frontend polling  
✅ **Better Reliability:** NOWPayments ensures delivery with retries  

---

## Fallback: Existing Polling Still Works

The existing frontend polling mechanism (`app/order/[id]/page.tsx`) is **still active** and serves as a fallback:
- If webhook fails or is delayed, polling will still detect status changes
- Polling stops when order reaches final states
- This provides redundancy and ensures status updates are never missed

---

## Files Modified/Created

### Created:
- `app/api/webhook/nowpayments/route.ts` - Webhook endpoint

### Modified:
- `lib/db-orders.ts` - Added `getOrderByPaymentId()` and `updateOrderStatus()`
- `app/api/payment/route.ts` - Added default webhook URL configuration

### Not Changed:
- UI components (no changes to order creation flow or display)
- Frontend polling (kept as fallback)
- Order tracking endpoints (still work as before)

---

## Next Steps

1. ✅ Add `NOWPAYMENTS_IPN_SECRET` to `.env.local`
2. ✅ Set `NEXT_PUBLIC_APP_URL` if not using Vercel auto-detection
3. ✅ Deploy to production (webhook URL must be publicly accessible)
4. ✅ Test with a real order to verify webhook delivery
5. ✅ Monitor webhook logs for successful processing

---

## Troubleshooting

### Webhook Not Receiving Updates

1. **Check webhook URL is accessible:**
   - Must be publicly accessible (HTTPS in production)
   - Test with: `curl -X POST https://your-domain.com/api/webhook/nowpayments`

2. **Verify IPN Secret is configured:**
   - Check `.env.local` has `NOWPAYMENTS_IPN_SECRET`
   - Must match the secret in NOWPayments dashboard

3. **Check NOWPayments dashboard:**
   - Verify IPN is enabled
   - Check webhook delivery logs in NOWPayments dashboard

4. **Check application logs:**
   - Webhook processing logs will show signature verification results
   - Database update logs will show order status changes

### Database Status Not Updating

1. **Verify webhook is being received:**
   - Check server logs for webhook POST requests
   - Verify signature verification is passing

2. **Check order exists:**
   - Webhook requires order to exist in database
   - Order must have matching `payment_id`

3. **Verify database connection:**
   - Check Supabase configuration
   - Verify service role key is correct

---

## Security Notes

- ✅ Webhook signature verification prevents unauthorized requests
- ✅ Timing-safe comparison prevents timing attacks
- ✅ Production requires IPN secret (rejects requests without it)
- ✅ Webhook endpoint returns proper HTTP status codes
- ✅ Errors are logged but don't expose sensitive information

---

## Support

For issues or questions:
1. Check webhook logs in application console
2. Review NOWPayments IPN documentation
3. Verify environment variables are set correctly
4. Test webhook endpoint manually with curl/Postman

