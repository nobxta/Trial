# MintMove - Crypto Exchange

A modern cryptocurrency exchange landing page built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Premium Dark UI** - Deep blues, purples, and indigo gradient theme
- **Winter Theme** - Animated snowflakes and seasonal background elements
- **Centered Exchange Widget** - Single-purpose hero section with send/receive inputs
- **Real-time Rate Calculation** - Dynamic exchange rate updates
- **Fixed/Float Rate Toggle** - Choose between fixed (1.0%) or float (0.5%) rates
- **Currency Selection** - Support for BTC, ETH, USDT, BNB, SOL with dropdowns
- **NOWPayments Integration** - Real cryptocurrency payment addresses and QR codes
- **Background Elements** - Vector-style mountains, pine trees, and glowing crystals
- **Responsive Design** - Fully responsive layout for all screen sizes
- **Clean Navigation** - Minimal header with About, Blog, FAQ, API, Support links
- **Trust Signals** - "Trusted since 2018" footer messaging
- **Live Transaction Feed** - Recent transactions updating every 2 seconds
- **Order Execution Page** - Complete order tracking with QR codes and progress timeline

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase Database

This project uses Supabase as the database. Follow the setup guide:

1. See [README_SUPABASE.md](./README_SUPABASE.md) for detailed instructions
2. Create a Supabase project at [https://supabase.com](https://supabase.com)
3. Run the migration SQL from `supabase/migrations/001_create_users_table.sql` in your Supabase SQL Editor
4. Add your Supabase credentials to `.env.local`

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Secret (change this to a random string in production)
JWT_SECRET=your-secret-key-change-in-production

# App URL (for email verification links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Configuration (optional - for email verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false  # Set to 'true' for port 465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=MintMove  # Display name for sender (optional)

# NOWPayments API Configuration
# Get your API key from: https://nowpayments.io/settings?tab=api_keys
NOWPAYMENTS_API_KEY=your_api_key_here
NOWPAYMENTS_API_URL=https://api.nowpayments.io/v1
```

**To get your NOWPayments API key:**
1. Sign up at [NOWPayments](https://nowpayments.io/)
2. Go to Settings > Payments > API keys
3. Generate your API key
4. Copy the key to your `.env.local` file

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Integration

This project uses the NOWPayments API for:
- Generating cryptocurrency deposit addresses
- Creating payment orders
- Getting payment status
- Real-time order tracking

All API calls are made server-side through Next.js API routes for security.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- NOWPayments API
- CoinGecko API (for crypto logos)
- qrcode.react (for QR code generation)
- Lucide React (for icons)

## Project Structure

```
├── app/
│   ├── api/
│   │   └── payment/          # NOWPayments API routes
│   ├── order/[id]/           # Order execution page
│   └── page.tsx              # Home page
├── components/
│   ├── ExchangeWidget.tsx    # Main exchange widget
│   ├── OrderDetails.tsx      # Order information
│   ├── QRCodeSection.tsx     # QR code display
│   ├── ProgressTimeline.tsx  # Order progress tracking
│   └── ...
├── lib/
│   └── nowpayments.ts        # NOWPayments API client
└── .env.local                # Environment variables (not in git)

```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NOWPAYMENTS_API_KEY` | Your NOWPayments API key (server-side only) | Yes |
| `NOWPAYMENTS_API_URL` | NOWPayments API endpoint | No (defaults to https://api.nowpayments.io/v1) |
