# Quick Start Guide - Testing NOWPayments Integration

## ✅ Step 1: Verify Your .env.local File

Your `.env.local` file should be in the root directory with:

```bash
NOWPAYMENTS_API_KEY=your_actual_api_key_here
NOWPAYMENTS_API_URL=https://api.nowpayments.io/v1
```

## ✅ Step 2: Restart Dev Server

**IMPORTANT**: After adding/changing `.env.local`, you MUST restart your dev server:

1. Stop the current server (Ctrl+C)
2. Run: `npm run dev`
3. Wait for it to start completely

## ✅ Step 3: Test the Integration

1. **Open**: http://localhost:3000
2. **Fill in the form**:
   - Send amount: Enter any amount (e.g., `0.001` for BTC)
   - Destination: Enter a valid crypto address (e.g., Ethereum address)
   - Select currencies (BTC → ETH, etc.)
3. **Click "Exchange now"**

## 🔍 Troubleshooting

### If you see "API key not configured":
- ✅ Check `.env.local` exists in root directory
- ✅ Check the file has `NOWPAYMENTS_API_KEY=your_key` (no quotes needed)
- ✅ Restart dev server after creating/editing `.env.local`
- ✅ Check the key doesn't have extra spaces

### If you see "Invalid API key":
- ✅ Verify your API key is correct in NOWPayments dashboard
- ✅ Make sure you copied the full key
- ✅ Try regenerating the key in NOWPayments

### If you see "Minimum payment amount":
- ✅ NOWPayments requires minimum $0.50 USD
- ✅ Increase your send amount

### Check Server Logs:

When you start the dev server, you should see in the console:
```
NOWPayments API URL: https://api.nowpayments.io/v1
NOWPayments API Key configured: Yes
```

If you see "No" for API key, the environment variable isn't being loaded.

## 🎯 What Should Happen

1. Click "Exchange now" → Button shows "Creating order..."
2. API creates payment → Returns real deposit address
3. Page redirects → `/order/[orderId]` page
4. You see:
   - ✅ Real deposit address from NOWPayments
   - ✅ QR code with the real address
   - ✅ Order details with payment ID
   - ✅ Countdown timer
   - ✅ Progress timeline

## 🔒 Security Notes

- ✅ API key is **server-side only** (never exposed to browser)
- ✅ `.env.local` is in `.gitignore` (won't be committed)
- ✅ All API calls go through `/api/payment` route (secure)

