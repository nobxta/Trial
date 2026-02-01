# Email Sender Address Refactoring

**Date:** Refactoring Complete  
**Goal:** Make all sender email addresses configurable via .env, no hardcoded addresses

---

## Summary

The email system has been refactored to use configurable sender addresses via environment variables. All sender addresses are now MintMove-branded and can be easily changed by updating `.env` variables without touching code.

---

## New Files

### `lib/email-from.ts`

Central mapping system that maps email categories to environment variables:

- **AUTH** → `EMAIL_FROM_NOREPLY`
- **TRANSACTIONAL** → `EMAIL_FROM_RECEIPTS`
- **ADMIN** → `EMAIL_FROM_ADMIN`
- **ALERT** → `EMAIL_FROM_ALERT`
- **MARKETING** → `EMAIL_FROM_NEWS`
- **SUPPORT** → `EMAIL_FROM_SUPPORT`
- **GENERIC** → `EMAIL_FROM_HELLO`

**Functions:**
- `getSenderEmail(category)` - Gets email address for category (throws if missing)
- `getSenderName()` - Gets sender name (defaults to "MintMove")
- `getFromHeader(category)` - Gets full "From" header value

---

## Modified Files

### `lib/email.ts`

**Changes:**

1. **Updated `sendEmailViaSMTP()`**
   - Added `category` parameter (required)
   - Uses `getFromHeader(category)` to get sender address
   - Enhanced logging with category info:
     ```
     📧 [MintMove] Sending {CATEGORY} email
        From: resolved@email
        To: user@email
     ```

2. **Updated `sendVerificationEmail()`**
   - Uses `category: 'AUTH'` for verification emails
   - Sender address comes from `EMAIL_FROM_NOREPLY`

3. **Updated `sendGenericEmail()`**
   - Added `category` parameter (defaults to `'GENERIC'`)
   - Passes category to `sendEmailViaSMTP()`

### `lib/notifications.ts`

**Changes:**

1. **Order status notifications**
   - Uses `category: 'TRANSACTIONAL'`
   - Sender address comes from `EMAIL_FROM_RECEIPTS`

2. **Promotion/affiliate notifications**
   - Uses `category: 'MARKETING'`
   - Sender address comes from `EMAIL_FROM_NEWS`

---

## Email Category Usage

| Use Case | Category | Env Variable | Example Address |
|----------|----------|--------------|-----------------|
| User signup/verification | AUTH | EMAIL_FROM_NOREPLY | no-reply@mintmove.io |
| Payment success/failed | TRANSACTIONAL | EMAIL_FROM_RECEIPTS | receipts@mintmove.io |
| Admin-sent emails | ADMIN | EMAIL_FROM_ADMIN | admin@mintmove.io |
| Security/risk alerts | ALERT | EMAIL_FROM_ALERT | alert@mintmove.io |
| Promotions/newsletters | MARKETING | EMAIL_FROM_NEWS | news@mintmove.io |
| Support replies | SUPPORT | EMAIL_FROM_SUPPORT | support@mintmove.io |
| Generic/fallback | GENERIC | EMAIL_FROM_HELLO | hello@mintmove.io |

---

## Environment Variables

Add to `.env.local`:

```env
EMAIL_FROM_SUPPORT=support@mintmove.io
EMAIL_FROM_NOREPLY=no-reply@mintmove.io
EMAIL_FROM_ADMIN=admin@mintmove.io
EMAIL_FROM_ALERT=alert@mintmove.io
EMAIL_FROM_RECEIPTS=receipts@mintmove.io
EMAIL_FROM_NEWS=news@mintmove.io
EMAIL_FROM_HELLO=hello@mintmove.io

EMAIL_FROM_NAME=MintMove

# SMTP credentials (transport only, not sender identity)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user@example.com
SMTP_PASS=your-smtp-password
```

**See `.env.email.example` for detailed documentation.**

---

## Usage Examples

### Verification Email (AUTH category)

```typescript
await sendVerificationEmail(email, token, request);
// Uses EMAIL_FROM_NOREPLY
// From: "MintMove <no-reply@mintmove.io>"
```

### Order Status Email (TRANSACTIONAL category)

```typescript
await sendGenericEmail(
  userEmail,
  'Order 12345 - Status Update',
  htmlContent,
  textContent,
  'TRANSACTIONAL',
  request
);
// Uses EMAIL_FROM_RECEIPTS
// From: "MintMove <receipts@mintmove.io>"
```

### Promotion Email (MARKETING category)

```typescript
await sendGenericEmail(
  userEmail,
  'Special Promotion',
  htmlContent,
  textContent,
  'MARKETING',
  request
);
// Uses EMAIL_FROM_NEWS
// From: "MintMove <news@mintmove.io>"
```

---

## Logging

Enhanced logging shows category and resolved sender address:

```
📧 [MintMove] Sending AUTH email
   From: no-reply@mintmove.io
   To: user@example.com
✅ [MintMove] Email sent to user@example.com (AUTH): Verify your MintMove account
```

Or on failure:

```
❌ [MintMove] Email failed to user@example.com (AUTH): SMTP error message
```

---

## Error Handling

If a required environment variable is missing:

```typescript
// Throws: "Missing required environment variable: EMAIL_FROM_NOREPLY. 
// This variable is required for AUTH category emails. 
// Please set it in your .env file."
getSenderEmail('AUTH');
```

---

## Future-Proofing

### Switching to Real MintMove SMTP

When you get real MintMove SMTP credentials:

1. **Update `.env` variables:**
   ```env
   EMAIL_FROM_NOREPLY=no-reply@mintmove.io
   EMAIL_FROM_RECEIPTS=receipts@mintmove.io
   # ... etc (all @mintmove.io addresses)
   
   SMTP_HOST=smtp.mintmove.io
   SMTP_USER=your-mintmove-smtp-user
   SMTP_PASS=your-mintmove-smtp-password
   ```

2. **No code changes needed!**
   - All sender addresses come from env variables
   - All code uses the category system
   - Just update .env and redeploy

### Switching to Resend/SendGrid

The category system is provider-agnostic. To switch providers:

1. Update SMTP credentials in `.env`
2. Or modify `sendEmailViaSMTP()` to use Resend/SendGrid SDK
3. Sender addresses still come from the category system
4. No changes needed to call sites

---

## Benefits

✅ **No hardcoded email addresses** - All addresses come from env variables  
✅ **MintMove branding** - All sender addresses are @mintmove.io  
✅ **Easy to change** - Update .env, no code changes  
✅ **Future-proof** - Works with any SMTP provider  
✅ **Clear logging** - Shows category and resolved sender  
✅ **Error handling** - Throws explicit errors if env vars missing  
✅ **Type-safe** - TypeScript types for categories  

---

## Testing During Development

During development, you can temporarily use test addresses:

```env
# Temporary test configuration
EMAIL_FROM_NOREPLY=your-test-email@gmail.com
EMAIL_FROM_RECEIPTS=your-test-email@gmail.com
EMAIL_FROM_ADMIN=your-test-email@gmail.com
# ... etc

SMTP_USER=your-test-email@gmail.com
SMTP_PASS=your-test-app-password
```

When ready for production, just update to real MintMove addresses.

---

**End of Refactoring Summary**




