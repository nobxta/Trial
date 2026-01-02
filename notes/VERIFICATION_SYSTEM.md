# Email Verification System

## Features

1. **Email Verification Required**: Users must verify their email before signing in
2. **Automatic Cleanup**: Unverified accounts are deleted after 1 hour
3. **Resend Verification**: Users can request a new verification email
4. **Security**: Prevents unverified accounts from accessing the system

## How It Works

### Sign Up Flow
1. User signs up with email and password
2. Account is created with `email_verified = false`
3. Verification email is sent with a unique token
4. User has 1 hour to verify their email

### Sign In Flow
1. User attempts to sign in
2. System checks if email is verified
3. If not verified: Shows message and resend button
4. If verified: Allows sign in

### Verification Flow
1. User clicks verification link in email
2. System validates the token
3. Sets `email_verified = true`
4. User can now sign in

### Cleanup Process
- Runs automatically on each signup (non-blocking)
- Deletes unverified accounts older than 1 hour
- Can also be triggered via API endpoint

## API Endpoints

### POST `/api/auth/resend-verification`
Resends verification email to user.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent. Please check your inbox."
}
```

### POST `/api/auth/cleanup-unverified`
Manually trigger cleanup of unverified accounts (optional, runs automatically).

**Headers (optional for security):**
```
Authorization: Bearer YOUR_CLEANUP_SECRET
```

**Response:**
```json
{
  "success": true,
  "message": "Cleaned up 3 unverified account(s)",
  "deletedCount": 3
}
```

## Environment Variables

Add to `.env.local`:

```env
# Optional: Secret for cleanup endpoint (recommended for production)
CLEANUP_SECRET=your-random-secret-key
```

## Setting Up Automated Cleanup (Optional)

For production, you can set up a cron job to run cleanup periodically:

### Using Vercel Cron (if deployed on Vercel)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/auth/cleanup-unverified",
    "schedule": "0 * * * *"
  }]
}
```

### Using External Cron Service

Set up a cron job to call:
```
POST https://yourdomain.com/api/auth/cleanup-unverified
Authorization: Bearer YOUR_CLEANUP_SECRET
```

Schedule: Every hour (`0 * * * *`)

## User Experience

### Sign In Page
- If email not verified: Shows yellow warning message
- "Resend verification email" button appears
- Success message when email is resent

### Sign Up Page
- Shows success message after signup
- Displays verification URL in development mode
- Instructions to check email

## Security Notes

1. **Unverified accounts are blocked** from signing in
2. **Accounts auto-delete** after 1 hour if not verified
3. **Resend verification** generates a new token (old token becomes invalid)
4. **Cleanup endpoint** can be secured with `CLEANUP_SECRET`

## Testing

1. Sign up with a new email
2. Try to sign in immediately → Should show verification message
3. Click "Resend verification email" → Should send new email
4. Verify email via link → Should allow sign in
5. Wait 1 hour without verifying → Account should be deleted

