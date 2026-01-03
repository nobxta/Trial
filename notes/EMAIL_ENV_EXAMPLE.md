# Email Environment Variables Example

Copy these variables to your `.env.local` file.

```env
# Email Sender Configuration for MintMove
# 
# These variables define the sender email addresses for different email categories.
# All addresses should be MintMove-branded (e.g., @mintmove.io) but can temporarily
# point to test SMTP providers during development.
#
# When you switch to real MintMove SMTP, you only need to update these .env values.
# No code changes required.

# Email Category Mappings:
# AUTH → EMAIL_FROM_NOREPLY (account verification, password reset, etc.)
# TRANSACTIONAL → EMAIL_FROM_RECEIPTS (payment confirmations, order updates, etc.)
# ADMIN → EMAIL_FROM_ADMIN (admin-sent emails)
# ALERT → EMAIL_FROM_ALERT (security alerts, risk notifications)
# MARKETING → EMAIL_FROM_NEWS (promotions, newsletters, affiliate earnings)
# SUPPORT → EMAIL_FROM_SUPPORT (support replies, customer service)
# GENERIC → EMAIL_FROM_HELLO (default fallback)

EMAIL_FROM_SUPPORT=support@mintmove.io
EMAIL_FROM_NOREPLY=no-reply@mintmove.io
EMAIL_FROM_ADMIN=admin@mintmove.io
EMAIL_FROM_ALERT=alert@mintmove.io
EMAIL_FROM_RECEIPTS=receipts@mintmove.io
EMAIL_FROM_NEWS=news@mintmove.io
EMAIL_FROM_HELLO=hello@mintmove.io

EMAIL_FROM_NAME=MintMove

# SMTP Configuration (transport credentials - can be from any provider)
# These are separate from sender addresses - they just define how to send emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user@example.com
SMTP_PASS=your-smtp-password

# Note: During testing, you might temporarily use:
# EMAIL_FROM_NOREPLY=your-test-email@gmail.com
# EMAIL_FROM_RECEIPTS=your-test-email@gmail.com
# etc.
# 
# When you get real MintMove SMTP, just update the EMAIL_FROM_* variables above
# to point to your real @mintmove.io addresses. The SMTP credentials below
# will be your actual MintMove SMTP server credentials.
```


