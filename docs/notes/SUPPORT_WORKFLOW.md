# Support Workflow for MintMove Exchange

## Quick Reference

When a user contacts you about an order issue, follow this workflow.

---

## 1. Finding an Order

### What You Need from User:
- **Order ID** (e.g., "ABC123") - This is the most important
- Optional: Email address they used (if they signed up)
- Optional: Payment transaction hash (if they have it)

### How to Find Order:

#### Option A: Using Database (Recommended)
```sql
-- Connect to Supabase SQL Editor
-- Find order by Order ID
SELECT * FROM orders WHERE order_id = 'ABC123';

-- Find order by user email
SELECT o.* FROM orders o
JOIN users u ON o.user_id = u.id
WHERE u.email = 'user@example.com'
ORDER BY o.created_at DESC;
```

#### Option B: Using API (if you have access)
```bash
# Get order by ID
curl https://your-domain.com/api/order/ABC123

# Track order (works without login)
curl -X POST https://your-domain.com/api/order/track \
  -H "Content-Type: application/json" \
  -d '{"order_id": "ABC123"}'
```

---

## 2. Verifying Payment

### Check Payment Status:

1. **Get payment_id from order**:
   ```sql
   SELECT payment_id FROM orders WHERE order_id = 'ABC123';
   ```

2. **Check NOWPayments status**:
   - Go to NOWPayments dashboard
   - Search by payment_id
   - Or use API:
   ```bash
   curl https://api.nowpayments.io/v1/payment/{payment_id} \
     -H "x-api-key: YOUR_API_KEY"
   ```

### Payment Status Meanings:
- `waiting` - User hasn't sent payment yet
- `confirming` - Payment received, waiting for confirmations
- `confirmed` - Payment confirmed, exchange should proceed
- `sending` - Exchange in progress
- `finished` / `success` - Order completed
- `failed` / `expired` - Order failed (user didn't pay in time)
- `refunded` - Order was refunded

---

## 3. Common Issues & Solutions

### Issue: "Order not found"
**Check:**
1. Verify Order ID is correct (case-sensitive, usually uppercase)
2. Check if order exists in database
3. If order exists but user can't see it:
   - Check if they're logged in (for account orders)
   - Try track order page (works without login)

### Issue: "Payment not received"
**Check:**
1. Verify payment_id in NOWPayments dashboard
2. Check blockchain explorer for transaction:
   - Get deposit address from order: `from_address`
   - Search on blockchain explorer (e.g., Etherscan, Blockchair)
3. If payment confirmed but order stuck:
   - Check NOWPayments webhook status
   - Manually update order status if needed

### Issue: "Order stuck in pending"
**Check:**
1. Payment status in NOWPayments
2. If payment is `finished` but order shows `pending`:
   - Update order status manually in database
   - Check if webhook was received

### Issue: "Wrong amount received"
**Check:**
1. Compare `from_amount` in order vs actual payment
2. If amount mismatch:
   - Order might be in EMERGENCY status
   - User needs to choose: continue at market rate OR refund
   - Use emergency API endpoint (if implemented)

---

## 4. Manual Order Resolution

### Update Order Status in Database:

```sql
-- Mark order as completed
UPDATE orders 
SET status = 'completed',
    updated_at = NOW()
WHERE order_id = 'ABC123';

-- Mark order as failed
UPDATE orders 
SET status = 'failed',
    updated_at = NOW()
WHERE order_id = 'ABC123';

-- Add refund address
UPDATE orders 
SET status = 'refunding',
    to_address = 'REFUND_ADDRESS_HERE',
    updated_at = NOW()
WHERE order_id = 'ABC123';
```

### Important Notes:
- Always update `updated_at` timestamp
- Document why you changed the status
- Notify user after manual changes

---

## 5. Refund Process

### If Refund is Needed:

1. **Get refund address from user** (must be same network as original send asset)

2. **Check NOWPayments refund options**:
   - Some payments can be refunded via NOWPayments API
   - Or manually send crypto from your wallet

3. **Update order status**:
   ```sql
   UPDATE orders 
   SET status = 'refunded',
       to_address = 'USER_REFUND_ADDRESS',
       updated_at = NOW()
   WHERE order_id = 'ABC123';
   ```

4. **Send refund** (via NOWPayments or manually)

5. **Update with refund transaction hash**:
   ```sql
   -- Add refund_tx field if you add it to schema
   -- Or document in notes
   ```

---

## 6. Emergency Situations

### Order in EMERGENCY Status:
This happens when payment amount doesn't match order amount.

**Options:**
1. **Continue at market rate** - Process exchange with actual received amount
2. **Refund** - Send payment back to user's refund address

**Manual Resolution:**
```sql
-- Option 1: Continue
UPDATE orders 
SET status = 'pending',
    from_amount = ACTUAL_RECEIVED_AMOUNT,
    updated_at = NOW()
WHERE order_id = 'ABC123';

-- Option 2: Refund
UPDATE orders 
SET status = 'refunding',
    to_address = 'REFUND_ADDRESS',
    updated_at = NOW()
WHERE order_id = 'ABC123';
```

---

## 7. Database Queries Cheat Sheet

```sql
-- Find all orders for a user
SELECT * FROM orders 
WHERE user_id = 'USER_UUID'
ORDER BY created_at DESC;

-- Find orders by status
SELECT * FROM orders 
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Find orders created in last 24 hours
SELECT * FROM orders 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Find orders with specific payment_id
SELECT * FROM orders 
WHERE payment_id = 'PAYMENT_ID';

-- Count orders by status
SELECT status, COUNT(*) 
FROM orders 
GROUP BY status;
```

---

## 8. Contact Information Needed

When user contacts you, always ask for:
1. ✅ **Order ID** (required)
2. ⚠️ Email (if they have account)
3. ⚠️ Payment transaction hash (if available)
4. ⚠️ Screenshot of error (if applicable)

---

## 9. Response Template

```
Hi [User],

I found your order [ORDER_ID].

Current Status: [STATUS]
Payment Status: [PAYMENT_STATUS]
Created: [DATE]

[EXPLANATION OF ISSUE]

[ACTION TAKEN / NEXT STEPS]

If you have any questions, please reply with your Order ID.

Best regards,
Support Team
```

---

## 10. Prevention Tips

- **Always save orders to database** (now implemented ✅)
- **Monitor NOWPayments webhooks** for status updates
- **Set up alerts** for orders stuck in pending > 1 hour
- **Regular database backups** before manual changes
- **Document all manual interventions**

---

## Quick Links

- **Supabase Dashboard**: [Your Supabase URL]
- **NOWPayments Dashboard**: https://nowpayments.io/dashboard
- **Order Tracking Page**: https://your-domain.com/track-order
- **API Documentation**: https://your-domain.com/docs

---

**Last Updated**: [Date]
**Version**: 1.0



