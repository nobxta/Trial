# Setup Guide - NOWPayments Integration

## How It Works

### 1. **Order Creation Flow**

When a user clicks "Exchange now" on the exchange widget:

```
User Input (Exchange Widget)
    ↓
Validates: Send Amount + Destination Address
    ↓
POST /api/payment (Next.js API Route)
    ↓
lib/nowpayments.ts → createPayment()
    ↓
NOWPayments API (https://api.nowpayments.io/v1/payment)
    ↓
Returns: payment_id, pay_address (deposit address), payment_status
    ↓
Saves to localStorage + Redirects to /order/[id]
```

### 2. **Order Page Flow**

```
User visits /order/[orderId]
    ↓
Loads order data from localStorage
    ↓
Fetches latest payment status from /api/payment?payment_id=xxx
    ↓
Displays: Real deposit address, QR code, payment status
    ↓
Polls every 10 seconds for status updates
```

### 3. **Environment Variables**

The API key is loaded from environment variables in this order:
1. Server-side: `process.env.NOWPAYMENTS_API_KEY` (recommended)
2. Fallback: `process.env.NEXT_PUBLIC_NOWPAYMENTS_API_KEY` (client-side accessible)

**Important**: Use `NOWPAYMENTS_API_KEY` (without NEXT_PUBLIC_) for security. This keeps the API key server-side only.

## Where to Create .env.local File

Create the `.env.local` file in the **root directory** of your project (same level as `package.json`):

```
MintMove/
├── .env.local          ← CREATE THIS FILE HERE
├── package.json
├── next.config.mjs
├── app/
├── components/
└── lib/
```

### Step-by-Step:

1. **Create the file** in your project root:
   ```
   C:\Users\NCS\Desktop\MintMove\.env.local
   ```

2. **Add your API credentials**:
   ```bash
   # NOWPayments API Configuration
   NOWPAYMENTS_API_KEY=your_api_key_here
   NOWPAYMENTS_API_URL=https://api.nowpayments.io/v1
   ```

3. **Get your API key**:
   - Sign up at https://nowpayments.io/
   - Go to Settings → Payments → API keys
   - Generate a new API key
   - Copy it to your `.env.local` file

4. **Restart your dev server**:
   ```bash
   npm run dev
   ```

## File Structure

```
MintMove/
├── .env.local                    # Environment variables (NOT in git)
├── .gitignore                    # Ignores .env.local
├── app/
│   ├── api/
│   │   └── payment/
│   │       └── route.ts         # API endpoint (server-side)
│   └── order/
│       └── [id]/
│           └── page.tsx         # Order page (client-side)
├── lib/
│   └── nowpayments.ts           # NOWPayments client (server-side)
└── components/
    ├── ExchangeWidget.tsx       # Creates orders
    ├── OrderDetails.tsx         # Shows order info
    └── QRCodeSection.tsx        # Shows QR code
```

## How Environment Variables Are Used

### Server-Side (Secure)
- `app/api/payment/route.ts` → Uses `lib/nowpayments.ts`
- `lib/nowpayments.ts` → Reads `process.env.NOWPAYMENTS_API_KEY`
- API key is **never exposed** to the browser

### Data Flow

1. **Client** (ExchangeWidget) → POST to `/api/payment`
2. **Server** (route.ts) → Calls `createPayment()` with API key
3. **NOWPayments API** → Returns real payment address
4. **Server** → Returns payment data to client
5. **Client** → Saves to localStorage and shows order page

## Testing Without API Key

If you don't have an API key yet, the app will show an error message when creating orders. You can still test the UI flow, but it won't create real payments.

## Security Notes

✅ **DO**: 
- Use `NOWPAYMENTS_API_KEY` (server-side only)
- Keep `.env.local` in `.gitignore` (already done)
- Never commit API keys to git

❌ **DON'T**:
- Use `NEXT_PUBLIC_NOWPAYMENTS_API_KEY` unless absolutely necessary (exposes key to browser)
- Share your `.env.local` file
- Commit API keys to version control

