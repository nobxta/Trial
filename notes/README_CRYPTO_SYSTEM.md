# Crypto Asset System

This system fetches supported cryptocurrencies from NOWPayments API, normalizes them, and provides live prices from CoinGecko.

## Architecture

### Data Flow

1. **NOWPayments API** → Fetch raw currency list
2. **Normalization Script** → Convert to structured JSON
3. **CoinGecko API** → Fetch live prices (free, no API key)
4. **UI Components** → Display with NOWPayments hosted images

### Files

- `/data/supportedCoins.json` - Normalized crypto list (source of truth)
- `/data/coingeckoMap.json` - Symbol to CoinGecko ID mapping
- `/lib/supported-cryptos.ts` - Utility functions
- `/app/api/crypto/prices/route.ts` - Price fetching endpoint
- `/app/api/crypto/sync/route.ts` - Sync currencies from NOWPayments

## Setup

### 1. Sync Currencies from NOWPayments

**Option A: Using API endpoint**
```bash
POST /api/crypto/sync
```

**Option B: Using script**
```bash
npx tsx scripts/fetch-and-normalize-currencies.ts
```

Make sure `NOWPAYMENTS_API_KEY` is set in your `.env.local` file.

### 2. Verify Sync

```bash
GET /api/crypto/sync
```

Returns sync status and currency count.

## Data Structure

### supportedCoins.json

```json
[
  {
    "id": "usdttrc20",
    "symbol": "USDT",
    "name": "Tether",
    "network": "TRC20",
    "coingeckoId": "tether",
    "imageUrl": "https://nowpayments.io/images/coins/usdt.svg",
    "enabled": true
  }
]
```

### Normalization Rules

- **Symbol**: Extracted by removing non-letters from ID
  - `usdttrc20` → `USDT`
  - `usdcbsc` → `USDC`

- **Network**: Detected from suffix
  - `trc20` → `TRC20`
  - `erc20` → `ERC20`
  - `bsc` → `BSC`
  - `sol` → `SOL`
  - No suffix → `MAINNET`

- **Image URL**: NOWPayments hosted SVG
  - Format: `https://nowpayments.io/images/coins/{symbol}.svg`
  - One image per coin (not per network)

- **CoinGecko ID**: Mapped from symbol using `coingeckoMap.json`
  - Coins without mapping have `coingeckoId: null`
  - These coins won't have live prices

## Usage

### Fetch Prices

Prices are fetched server-side and cached for 15-30 seconds:

```typescript
GET /api/crypto/prices
```

Returns:
```json
{
  "prices": {
    "bitcoin": { "usd": 50000, "usd_24h_change": 2.5 },
    "ethereum": { "usd": 3000, "usd_24h_change": -1.2 }
  },
  "cached": false,
  "timestamp": 1234567890
}
```

### Use in Components

```typescript
import { getEnabledCryptos, getCryptoById } from '@/lib/supported-cryptos';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';

// Get all enabled cryptos
const cryptos = getEnabledCryptos();

// Get crypto by NOWPayments ID
const crypto = getCryptoById('usdttrc20');

// Fetch prices
const { prices, loading } = useCryptoPrices();
```

### Image URLs

Components automatically use NOWPayments hosted images:

```typescript
<CryptoIcon 
  symbol="USDT" 
  imageUrl={crypto.imageUrl} 
/>
```

## API Endpoints

### POST /api/crypto/sync
Syncs currencies from NOWPayments API and saves to `supportedCoins.json`.

**Response:**
```json
{
  "success": true,
  "total": 150,
  "withCoinGecko": 120,
  "withoutCoinGecko": 30,
  "skipped": 0
}
```

### GET /api/crypto/sync
Checks sync status.

**Response:**
```json
{
  "synced": true,
  "total": 150,
  "withCoinGecko": 120,
  "withoutCoinGecko": 30,
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/crypto/prices
Fetches live prices from CoinGecko (cached 15-30 seconds).

**Response:**
```json
{
  "prices": {
    "bitcoin": { "usd": 50000, "usd_24h_change": 2.5 }
  },
  "cached": false,
  "timestamp": 1234567890
}
```

## Utility Functions

### `getSupportedCryptos()`
Returns all supported cryptos.

### `getEnabledCryptos()`
Returns only enabled cryptos.

### `getCryptoById(id: string)`
Get crypto by NOWPayments ID (e.g., `usdttrc20`).

### `getCryptosBySymbol(symbol: string)`
Get all cryptos with a given symbol (may return multiple due to networks).

### `getUniqueCoinGeckoIds()`
Get unique CoinGecko IDs for price fetching (excludes coins without mapping).

### `getCryptoImageUrl(crypto: SupportedCrypto)`
Get NOWPayments hosted image URL.

### `getNetworkLabel(network: string)`
Get human-readable network label.

## Notes

- **NOWPayments is source of truth** for supported currencies
- **CoinGecko is source of truth** for prices
- **Images are NOT downloaded** - uses NOWPayments hosted SVGs
- **Prices are cached** server-side (15-30 seconds)
- **Coins without CoinGecko mapping** won't have live prices
- **Never call CoinGecko from frontend** - always use `/api/crypto/prices`

## Troubleshooting

### No currencies found
Run sync: `POST /api/crypto/sync`

### Prices not loading
- Check if coins have `coingeckoId` in `supportedCoins.json`
- Verify CoinGecko API is accessible
- Check server logs for errors

### Images not loading
- Verify NOWPayments image URLs are correct
- Check network connectivity
- Images fallback to CryptoCompare CDN if NOWPayments fails

