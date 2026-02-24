/**
 * Script to fetch currencies from NOWPayments API and normalize them
 * Run with: npx tsx scripts/fetch-and-normalize-currencies.ts
 */

import fs from 'fs';
import path from 'path';

const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';
// SECURITY: Use server-only env. Never NEXT_PUBLIC_* — that would expose the key in client bundles.
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || '';

interface NormalizedCrypto {
  id: string;
  symbol: string;
  name: string;
  network: string;
  coingeckoId: string | null;
  imageUrl: string;
  enabled: boolean;
}

// Load CoinGecko mapping
function loadCoinGeckoMap(): Record<string, string> {
  const mapPath = path.join(process.cwd(), 'data', 'coingeckoMap.json');
  try {
    const content = fs.readFileSync(mapPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to load CoinGecko map:', error);
    return {};
  }
}

// Extract symbol from ID by removing non-letters
function extractSymbol(id: string): string {
  // Remove numbers and special characters, keep only letters
  const symbol = id.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return symbol;
}

// Detect network from ID suffix
function detectNetwork(id: string): string {
  const lowerId = id.toLowerCase();
  
  if (lowerId.endsWith('trc20')) return 'TRC20';
  if (lowerId.endsWith('erc20')) return 'ERC20';
  if (lowerId.endsWith('bsc')) return 'BSC';
  if (lowerId.endsWith('sol')) return 'SOL';
  if (lowerId.endsWith('polygon') || lowerId.endsWith('matic')) return 'POLYGON';
  if (lowerId.endsWith('opt') || lowerId.endsWith('optimism')) return 'OPTIMISM';
  if (lowerId.endsWith('arb') || lowerId.endsWith('arbitrum')) return 'ARBITRUM';
  if (lowerId.endsWith('avax') || lowerId.endsWith('avalanche')) return 'AVALANCHE';
  if (lowerId.endsWith('ln') || lowerId.endsWith('lightning')) return 'LIGHTNING';
  
  // No suffix means MAINNET
  return 'MAINNET';
}

// Get CoinGecko ID from symbol
function getCoinGeckoId(symbol: string, coingeckoMap: Record<string, string>): string | null {
  const lowerSymbol = symbol.toLowerCase();
  return coingeckoMap[lowerSymbol] || null;
}

// Generate image URL from full asset id (e.g. usdttrc20) so icons match per network/coin
function getImageUrl(assetId: string): string {
  const normalized = assetId.toLowerCase().trim().replace(/[-_\s]/g, '');
  return `https://nowpayments.io/images/coins/${normalized}.svg`;
}

// Normalize a currency ID from NOWPayments
function normalizeCurrency(id: string, coingeckoMap: Record<string, string>): NormalizedCrypto | null {
  const symbol = extractSymbol(id);
  
  // Skip if symbol is empty
  if (!symbol || symbol.length === 0) {
    return null;
  }
  
  const network = detectNetwork(id);
  const coingeckoId = getCoinGeckoId(symbol, coingeckoMap);
  const imageUrl = getImageUrl(id);
  
  // Get a readable name from common coin names
  const coinNames: Record<string, string> = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'USDT': 'Tether',
    'USDC': 'USD Coin',
    'BNB': 'BNB',
    'SOL': 'Solana',
    'XRP': 'Ripple',
    'ADA': 'Cardano',
    'DOGE': 'Dogecoin',
    'AVAX': 'Avalanche',
    'MATIC': 'Polygon',
    'DOT': 'Polkadot',
    'LTC': 'Litecoin',
    'LINK': 'Chainlink',
    'UNI': 'Uniswap',
    'ATOM': 'Cosmos',
    'TON': 'Toncoin',
    'TRX': 'Tron',
    'APT': 'Aptos',
    'ARB': 'Arbitrum',
  };
  
  const name = coinNames[symbol] || symbol
    .split(/(?=[A-Z])/)
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
  
  return {
    id,
    symbol,
    name,
    network,
    coingeckoId: coingeckoId || null,
    imageUrl,
    enabled: true,
  };
}

// Fetch currencies from NOWPayments
async function fetchNowPaymentsCurrencies(): Promise<string[]> {
  if (!NOWPAYMENTS_API_KEY) {
    throw new Error('NOWPAYMENTS_API_KEY is not set. Please set it in your .env.local file.');
  }

  const response = await fetch(`${NOWPAYMENTS_API_URL}/currencies`, {
    method: 'GET',
    headers: {
      'x-api-key': NOWPAYMENTS_API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NOWPayments API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const data = await response.json();
  
  // NOWPayments returns either an array or an object with a currencies array
  if (Array.isArray(data)) {
    return data;
  } else if (data.currencies && Array.isArray(data.currencies)) {
    return data.currencies;
  } else {
    throw new Error('Unexpected response format from NOWPayments API');
  }
}

// Main function
async function main() {
  try {
    console.log('🔄 Fetching currencies from NOWPayments...');
    const currencyIds = await fetchNowPaymentsCurrencies();
    console.log(`✅ Fetched ${currencyIds.length} currencies from NOWPayments`);

    console.log('🔄 Loading CoinGecko mapping...');
    const coingeckoMap = loadCoinGeckoMap();
    console.log(`✅ Loaded ${Object.keys(coingeckoMap).length} CoinGecko mappings`);

    console.log('🔄 Normalizing currencies...');
    const normalized: NormalizedCrypto[] = [];
    const skipped: string[] = [];

    for (const id of currencyIds) {
      const normalizedCrypto = normalizeCurrency(id, coingeckoMap);
      if (normalizedCrypto) {
        normalized.push(normalizedCrypto);
      } else {
        skipped.push(id);
      }
    }

    if (skipped.length > 0) {
      console.log(`⚠️  Skipped ${skipped.length} currencies:`, skipped.slice(0, 10));
    }

    console.log(`✅ Normalized ${normalized.length} currencies`);

    // Save to file
    const outputPath = path.join(process.cwd(), 'data', 'supportedCoins.json');
    fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2), 'utf-8');
    console.log(`✅ Saved normalized currencies to ${outputPath}`);

    // Print summary
    console.log('\n📊 Summary:');
    console.log(`   Total currencies: ${normalized.length}`);
    console.log(`   With CoinGecko mapping: ${normalized.filter(c => c.coingeckoId).length}`);
    console.log(`   Without CoinGecko mapping: ${normalized.filter(c => !c.coingeckoId).length}`);
    
    const networks = new Set(normalized.map(c => c.network));
    console.log(`   Networks: ${Array.from(networks).join(', ')}`);

    console.log('\n✅ Done!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { normalizeCurrency, fetchNowPaymentsCurrencies };

