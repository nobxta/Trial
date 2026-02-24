# Coin Logo Pipeline – Technical Deep-Dive

This document traces exactly how coin logos (USDT, ETH, BTC, SOL, etc.) are sourced, built, and rendered in MintMove.

---

## 1. Summary: How logos are sourced

| Aspect | Answer |
|--------|--------|
| **Primary source** | **URL-constructed (not API-fetched)** – logos come from fixed CDN URLs built from asset IDs. |
| **Main CDN** | **NOWPayments** – `https://nowpayments.io/images/coins/{assetId}.svg` |
| **Fallbacks** | Hardcoded CDN URLs: CryptoCompare, SpotHQ (jsdelivr), CoinGecko (2 symbols only), then local SVG/text fallback. |
| **API at runtime for logos?** | **No** – no logo API call at runtime. CoinGecko API is used only for **prices**, not for logo URLs. |
| **Token list (Uniswap-style)?** | **No** – no token list JSON used for logos. |
| **Contract / token metadata?** | **No** – no SPL/ERC-20 token URI or on-chain metadata for logos. |

So: logos are **URL-constructed from a known asset list**, with **cascading fallbacks** (NOWPayments → local → CryptoCompare → SpotHQ → CoinGecko → in-app fallback). They are **not** hardcoded image files per coin, and **not** fetched from a logo API at request time.

---

## 2. Where the coin list is defined

- **File:** `data/supportedAssets.json`
- **Structure:** Array of assets with `symbol`, `name`, `networks[]`, `coingeckoId`, `nowpaymentsId`.
- **Example:**

```json
{"symbol":"USDT","name":"Tether","networks":["Ethereum","Tron","BNB Smart Chain","Solana"],"coingeckoId":"tether","nowpaymentsId":"usdt"}
{"symbol":"ETH","name":"Ethereum","networks":["Ethereum","Base","Arbitrum","BNB Smart Chain"],"coingeckoId":"ethereum","nowpaymentsId":"eth"}
```

- **Loaded by:** `lib/supportedAssets.ts` (imports this JSON and builds network-specific entries with `id` and `imageUrl`).

**Code:** `lib/supportedAssets.ts`

```ts
import supportedAssetsData from '../data/supportedAssets.json';
// ...
const id = generateNowPaymentsId(asset.symbol, networkName, asset.nowpaymentsId);
networks.push({
  id,
  symbol: asset.symbol,
  name: asset.name,
  network: networkName,
  networkCode,
  coingeckoId: asset.coingeckoId,
  imageUrl: `https://nowpayments.io/images/coins/${id}.svg`,
  enabled: true,
});
```

So the **coin list** is the JSON; the **logo URL** for each entry is **derived** as `https://nowpayments.io/images/coins/{id}.svg` (no API call).

---

## 3. Logo URL construction (no API for logos)

### 3.1 From supported assets (selector, exchange widget, about page)

- **File:** `lib/supportedAssets.ts`
- **Formula:** `imageUrl = "https://nowpayments.io/images/coins/" + id + ".svg"`
- **`id`** = NOWPayments-style id (e.g. `btc`, `eth`, `usdttrc20`, `usdcerc20`), from `generateNowPaymentsId(symbol, network, nowpaymentsId)`.

**Snippet:**

```ts
// lib/supportedAssets.ts (lines 147–149)
// NOWPayments coin images are keyed by the NOWPayments currency id (e.g. usdttrc20, eth, btc)
imageUrl: `https://nowpayments.io/images/coins/${id}.svg`,
```

- **Consumers:**  
  - `lib/supported-cryptos.ts` re-exports `SupportedAssetNetwork` (includes `imageUrl`).  
  - `CryptoSelector`, `ExchangeWidget`, `CurrencyNetworkSelector`, `RecentTransactions`, `about` page all use `crypto.imageUrl` / `displayNetwork.imageUrl` and pass it into `CryptoIcon` as `imageUrl`.

### 3.2 From raw asset code (order page, order details, QR modal)

When the app only has a **currency/network code** (e.g. from order API: `payCurrency`, `payNetwork`), the logo URL is built in:

- **File:** `lib/asset-normalize.ts`
- **Functions:** `normalizeAsset()`, `getAssetIconUrl()`

**Formula (same CDN, different input):**

```ts
// lib/asset-normalize.ts (lines 264–265, 297–302)
// normalizeAsset():
const iconUrl = `https://nowpayments.io/images/coins/${normalizedCode}.svg`;

// getAssetIconUrl():
if (!code) return `https://nowpayments.io/images/coins/default.svg`;
return normalized?.iconUrl || `https://nowpayments.io/images/coins/${lookupCode}.svg`;
```

- **`normalizedCode` / `lookupCode`** = normalized asset id (e.g. `usdttrc20`, `flokierc20`) from `normalizeCodeForLookup()` (lowercase, no underscores).
- **Default when no code:** `https://nowpayments.io/images/coins/default.svg`

So: **same NOWPayments base URL**, built either from the supported-asset `id` or from a normalized asset code. **No logo API** – only string construction.

---

## 4. Script that aligns with NOWPayments (optional, not used at runtime for logos)

- **File:** `scripts/fetch-and-normalize-currencies.ts`
- **Purpose:** Fetches **currency list** from NOWPayments API and normalizes to a JSON (e.g. for syncing supported coins). **Not used to fetch logo URLs at runtime.**
- **Logo in script:** Same formula:

```ts
// scripts/fetch-and-normalize-currencies.ts (lines 67–69)
function getImageUrl(assetId: string): string {
  const normalized = assetId.toLowerCase().trim().replace(/[-_\s]/g, '');
  return `https://nowpayments.io/images/coins/${normalized}.svg`;
}
```

- **API used:** `GET https://api.nowpayments.io/v1/currencies` (returns list of currency **ids**, not image URLs). So the only “API” involved for logos is this **build-time/sync** script; at runtime, logos are **only** URL construction.

---

## 5. Data flow: from list to UI

### 5.1 Selector / home (exchange widget)

1. **Coin list:** `data/supportedAssets.json` → `lib/supportedAssets.ts` → `loadSupportedAssetNetworks()` builds `SupportedAssetNetwork[]` with `id`, `symbol`, `imageUrl`.
2. **imageUrl:** `https://nowpayments.io/images/coins/${id}.svg` (no API).
3. **UI:** `lib/supported-cryptos.ts` exposes `getEnabledCryptos()` etc. → `CryptoSelector` / `ExchangeWidget` use `crypto.imageUrl` → pass to `<CryptoIcon imageUrl={crypto.imageUrl} symbol={...} />`.

### 5.2 Order page (by order id)

1. **Data:** Order from `GET /api/order/[id]`: `payCurrency`, `payNetwork`, `outcomeCurrency`, `outcomeNetwork`.
2. **Icon URL:**  
   - `getAssetInfo(assetCode)` uses `normalizeAsset(assetCode)` → `iconUrl` from `asset-normalize.ts`.  
   - If API sends separate currency + network, `getAssetIconUrl(payCurrency, payNetwork)` (and same for outcome) so the icon matches the selector (e.g. USDC+TRC20 → `usdctrc20`).
3. **Snippet:** `app/order/[id]/page.tsx` (lines 402–410):

```ts
const sendIconUrl =
  order.payNetwork?.trim() && !sendInfo.network
    ? getAssetIconUrl(order.payCurrency, order.payNetwork)
    : sendInfo.iconUrl;
const receiveIconUrl =
  order.outcomeNetwork?.trim() && !receiveInfo.network
    ? getAssetIconUrl(order.outcomeCurrency, order.outcomeNetwork)
    : receiveInfo.iconUrl;
```

4. **UI:** `<CryptoIcon symbol={...} imageUrl={sendIconUrl|receiveIconUrl} />`, and same URLs are passed to `OrderSummary`, `OrderInfoQRCard`, `DepositAddressCard`, `QRModal` where needed.

### 5.3 Order details / deposit / QR modal

- **OrderDetails:** `depositIconUrl` or `getAssetIconUrl(depositAssetCode || depositSymbol)` → `CryptoIcon imageUrl={...}`.
- **QRModal:** Receives `imageUrl` from parent (order page) → `CryptoIcon symbol={...} imageUrl={imageUrl}`.

So the **only** “response” involved is the **order API** (currency/network fields). Logo URL is **computed** from those fields, not returned as a “logo” field from an image API.

---

## 6. Where the logo is rendered: `CryptoIcon`

- **File:** `components/CryptoIcon.tsx`
- **Props:** `symbol`, `imageUrl?`, `image?`, `className`
- **Behavior:** Tries several URL sources in order; on `onError`, moves to the next source until a final in-app fallback.

### 6.1 Logo source order (cascade)

| Priority | Source | When used | URL shape / origin |
|----------|--------|-----------|----------------------|
| 1 | **NOWPayments** | `imageUrl` (or `image` starting with `http`) passed in | `https://nowpayments.io/images/coins/{id}.svg` |
| 2 | **Local** | `image` prop is a non-URL path (and not `/coins/...`) | e.g. static path from app |
| 3 | **CryptoCompare** | Symbol in hardcoded map | `https://www.cryptocompare.com/media/{imageId}/{symbol}.png` |
| 4 | **SpotHQ (jsdelivr)** | Always (no map) | `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/{symbol}.png` |
| 5 | **CoinGecko** | Only if symbol in small hardcoded map | 2 entries: FLOKI, PYUSD (fixed CDN URLs) |
| 6 | **Fallback** | All above failed or N/A | In-app: `FallbackIcon` (colored circle + 2-letter symbol) or `DefaultFallbackIcon` (`/coins/default.svg`) |

Initial stage is set by the first available source in that order; no API call is made to “fetch” which URL to use.

### 6.2 Code references in `CryptoIcon.tsx`

**CryptoCompare (static map, no API):**

```ts
// Lines 13–64: cryptocompareImageIds
const cryptocompareImageIds: Record<string, string> = {
  BTC: "37746251",
  ETH: "37746838",
  USDT: "37746384",
  SOL: "41244034",
  // ... more symbols
};
// URL: https://www.cryptocompare.com/media/${imageId}/${lowerSymbol}.png
```

**CoinGecko (2 hardcoded CDN URLs only):**

```ts
// Lines 66–69: coingeckoImageUrls
const coingeckoImageUrls: Record<string, string> = {
  FLOKI: "https://coin-images.coingecko.com/coins/images/16746/small/PNG_image.png",
  PYUSD: "https://coin-images.coingecko.com/coins/images/31212/small/PYUSD_Token_Logo_2x.png",
};
```

**SpotHQ (pattern, no map):**

```ts
// Lines 163–164
const spotHqUrl = `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${lowerSymbol}.png`;
```

**Fallbacks:**

- Default image: `src="/coins/default.svg"` (local: `public/coins/default.svg`).
- Final: `FallbackIcon` – colored circle + first 2 letters of symbol (brand colors from `CRYPTO_BRAND_COLORS` in same file).

### 6.3 Next.js image domains

- **File:** `next.config.mjs`
- **Relevant hosts for logos:**  
  - `coin-images.coingecko.com` (pathname `/coins/images/**`)  
  - `www.cryptocompare.com` (pathname `/media/**`)  
  - `nowpayments.io` (pathname `/images/coins/**`)  

Note: SpotHQ (jsdelivr) is loaded via `<img src={spotHqUrl}>`, not Next.js `Image`; no `remotePatterns` entry needed for that.

---

## 7. Files involved in the logo pipeline

| File | Role |
|------|------|
| `data/supportedAssets.json` | Canonical coin list (symbol, networks, nowpaymentsId). |
| `lib/supportedAssets.ts` | Builds network-level list and sets `imageUrl = nowpayments.io/.../coins/{id}.svg`. |
| `lib/supported-cryptos.ts` | Re-exports supported assets; `getCryptoImageUrl(crypto)` returns `crypto.imageUrl`. |
| `lib/asset-normalize.ts` | Normalizes raw asset codes; builds `iconUrl` and `getAssetIconUrl()` for order/QR/deposit flows. |
| `components/CryptoIcon.tsx` | Renders logo with cascade: NOWPayments → local → CryptoCompare → SpotHQ → CoinGecko → fallback. |
| `app/order/[id]/page.tsx` | Gets order data; computes `sendIconUrl`/`receiveIconUrl` via `getAssetInfo`/`getAssetIconUrl`; passes to `CryptoIcon`, `OrderSummary`, `OrderInfoQRCard`, `DepositAddressCard`, `QRModal`. |
| `components/CryptoSelector.tsx` | Uses `crypto.imageUrl` from supported cryptos → `CryptoIcon`. |
| `components/ExchangeWidget.tsx` | Uses `sendCrypto?.imageUrl` (and receive) → passed where icons are shown. |
| `components/OrderSummary.tsx` | Receives `sendIconUrl` / `receiveIconUrl` → `CryptoIcon`. |
| `components/OrderDetails.tsx` | Uses `depositIconUrl` or `getAssetIconUrl(depositAssetCode \|\| depositSymbol)` → `CryptoIcon`. |
| `components/order/QRModal.tsx` | Receives `imageUrl` from parent → `CryptoIcon`. |
| `components/RecentTransactions.tsx` | `getCryptoImageUrl(symbol)` from supported cryptos → `fromImageUrl`/`toImageUrl` → `CryptoIcon`. |
| `components/CurrencyNetworkSelector.tsx` | Uses `displayNetwork.imageUrl` → `CryptoIcon`. |
| `app/about/page.tsx` | Uses `displayNetwork.imageUrl` → `CryptoIcon`. |
| `scripts/fetch-and-normalize-currencies.ts` | Build-time: fetches NOWPayments currency ids; builds same `imageUrl` formula (not used at runtime for logos). |
| `next.config.mjs` | Allows remote images for nowpayments.io, cryptocompare.com, coin-images.coingecko.com. |
| `public/coins/default.svg` | Default/fallback local image. |

---

## 8. Fallback logic (where and how)

- **Where:** Entirely inside `components/CryptoIcon.tsx`.
- **How:**  
  - Initial stage = first available of: `nowpayments` → `local` → `cryptocompare` → `spothq` (coingecko only if symbol in small map).  
  - On `<img onError>`, `nextStage(failed)` picks the next available source in the same order; if none, `"fallback"`.  
  - When stage is `"fallback"`, component renders `FallbackIcon` (colored circle + 2-letter symbol).  
  - `DefaultFallbackIcon` (local `/coins/default.svg`) is defined but the final branch returns `FallbackIcon`; default.svg is only used if you were to render `DefaultFallbackIcon` elsewhere (currently not in the cascade). So the **effective** default when all remote URLs fail is the **symbol-in-circle** (`FallbackIcon`).

---

## 9. What is NOT used for logos

- **No CoinGecko API for logos** – CoinGecko is used for **prices** only (`/api/v3/simple/price`, `/coins/markets`, etc.). The only CoinGecko “logos” are 2 fixed CDN URLs in `CryptoIcon.tsx` (FLOKI, PYUSD).
- **No CoinMarketCap** – not referenced for logos.
- **No DexScreener** – not referenced for logos.
- **No token metadata** – no SPL token metadata or ERC-20 token URI used for logo URLs.
- **No Uniswap/token-list JSON** – no token list format used to supply logo URLs.
- **No runtime logo API** – no endpoint that returns “logo URL” for a coin; only NOWPayments **currency list** API in a **script**, and that script only uses it to build the same static URL pattern.

---

## 10. One-line answers

- **Where is the logo for USDT/ETH/BTC/SOL sourced?**  
  From **NOWPayments CDN**: `https://nowpayments.io/images/coins/{id}.svg` (e.g. `usdt`, `usdttrc20`, `eth`, `btc`, `sol`). If that fails, from CryptoCompare, then SpotHQ, then (for 2 symbols) CoinGecko CDN, then in-app fallback.

- **Exact API/endpoint for logos?**  
  There is **no** logo API at runtime. The only “API” is NOWPayments `GET https://api.nowpayments.io/v1/currencies` used in **scripts** to get currency **ids**; logo URL is always **built** as `https://nowpayments.io/images/coins/{id}.svg`.

- **CDN or static folder?**  
  **CDN:** NOWPayments, CryptoCompare, jsdelivr (SpotHQ), CoinGecko images. **Static:** `public/coins/default.svg` (and optional local `image` in `CryptoIcon`).

- **Hardcoded vs API-fetched vs contract vs token list?**  
  **URL-constructed** from a **hardcoded asset list** (`supportedAssets.json` + normalization). Fallback URLs are **hardcoded** (CryptoCompare ids, 2 CoinGecko URLs, SpotHQ pattern). **Not** API-fetched at runtime, **not** from contract/token metadata, **not** from a Uniswap-style token list.
