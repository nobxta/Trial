// CoinGecko API v3 Service Layer
// Handles all CoinGecko API interactions with caching and error handling

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Coin ID Reference - Map symbols to CoinGecko IDs
// ONLY includes supported assets from supportedAssets.ts
export const COIN_IDS: Record<string, string> = {
  '1INCH': '1inch',
  'AAVE': 'aave',
  'ADA': 'cardano',
  'ALGO': 'algorand',
  'APE': 'apecoin',
  'APT': 'aptos',
  'ARB': 'arbitrum',
  'AVAX': 'avalanche-2',
  'BABYDOGE': 'babydoge-coin',
  'BCH': 'bitcoin-cash',
  'BNB': 'binancecoin',
  'BTC': 'bitcoin',
  'DASH': 'dash',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'ETH': 'ethereum',
  'FLOKI': 'floki',
  'GALA': 'gala',
  'HMSTR': 'hamster-kombat',
  'INJ': 'injective-protocol',
  'KAS': 'kaspa',
  'LTC': 'litecoin',
  'LUNA': 'terra-luna',
  'MANA': 'decentraland',
  'MATIC': 'polygon',
  'NEAR': 'near',
  'NOT': 'notcoin',
  'PEPE': 'pepe',
  'PYUSD': 'paypal-usd',
  'SHIB': 'shiba-inu',
  'SOL': 'solana',
  'SUI': 'sui',
  'TON': 'the-open-network',
  'TRUMP': 'trump',
  'TRX': 'tron',
  'TUSD': 'true-usd',
  'UNI': 'uniswap',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'VET': 'vechain',
  'XLM': 'stellar',
  'XMR': 'monero',
  'XRP': 'ripple',
  'ZEC': 'zcash',
};

// Helper function to get CoinGecko ID from symbol
export function getCoinId(symbol: string): string | null {
  const upperSymbol = symbol.toUpperCase();
  return COIN_IDS[upperSymbol] || null;
}

// Market data response structure from CoinGecko
export interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  last_updated: string;
}

// Coin list item structure
export interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
}

// Coin details structure (for single coin fetch)
export interface CoinDetails {
  id: string;
  symbol: string;
  name: string;
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  market_data: {
    current_price: Record<string, number>;
    market_cap: Record<string, number>;
    market_cap_rank: number;
    total_volume: Record<string, number>;
    high_24h: Record<string, number>;
    low_24h: Record<string, number>;
    price_change_24h: number;
    price_change_percentage_24h: number;
    circulating_supply: number;
    total_supply: number;
    max_supply: number | null;
  };
  last_updated: string;
}

// Cache structure
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache with 60-second TTL
const CACHE_TTL = 60000; // 60 seconds

const marketDataCache = new Map<string, CacheEntry<CoinMarketData[]>>();
let coinListCache: CacheEntry<CoinListItem[]> | null = null;
const coinDetailsCache = new Map<string, CacheEntry<CoinDetails>>();

// Helper to check if cache entry is valid
function isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
}

// Helper to get cached data
function getCachedMarketData(coinIds?: string[]): CoinMarketData[] | null {
  const cacheKey = coinIds ? coinIds.sort().join(',') : 'all';
  const cached = marketDataCache.get(cacheKey);
  if (isCacheValid(cached)) {
    return cached!.data;
  }
  return null;
}

// Helper to set cache
function setCachedMarketData(coinIds: string[] | undefined, data: CoinMarketData[]): void {
  const cacheKey = coinIds ? coinIds.sort().join(',') : 'all';
  marketDataCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

// Rate limiting - track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests to avoid rate limits

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 60s
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });
    }
    
    return response;
  } catch (error) {
    console.error('CoinGecko API request failed:', error);
    throw error;
  }
}

/**
 * Fetch market data for multiple coins
 * @param coinIds Optional array of CoinGecko coin IDs. If not provided, fetches top 100 by market cap
 * @param vsCurrency Currency to compare against (default: usd)
 * @param limit Number of results to return (default: 100, max: 250)
 * @returns Array of coin market data
 */
export async function fetchMarketData(
  coinIds?: string[],
  vsCurrency: string = 'usd',
  limit: number = 100
): Promise<CoinMarketData[]> {
  // Check cache first
  const cached = getCachedMarketData(coinIds);
  if (cached) {
    return cached;
  }

  try {
    let url = `${COINGECKO_API_BASE}/coins/markets?vs_currency=${vsCurrency}&per_page=${Math.min(limit, 250)}&order=market_cap_desc`;
    
    // If specific coin IDs are requested, add them to URL
    if (coinIds && coinIds.length > 0) {
      const idsParam = coinIds.map(id => id.toLowerCase()).join(',');
      url += `&ids=${idsParam}`;
    }

    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data: CoinMarketData[] = await response.json();
    
    // Cache the response
    setCachedMarketData(coinIds, data);
    
    return data;
  } catch (error) {
    console.error('Failed to fetch market data from CoinGecko:', error);
    
    // Return cached data even if expired, as fallback
    const cached = getCachedMarketData(coinIds);
    if (cached) {
      console.warn('Using expired cache due to API error');
      return cached;
    }
    
    throw error;
  }
}

/**
 * Fetch market data for coins by their symbols (e.g., ['BTC', 'ETH'])
 * Automatically converts symbols to CoinGecko IDs
 */
export async function fetchMarketDataBySymbols(
  symbols: string[],
  vsCurrency: string = 'usd'
): Promise<CoinMarketData[]> {
  const coinIds = symbols
    .map(symbol => getCoinId(symbol))
    .filter((id): id is string => id !== null);
  
  if (coinIds.length === 0) {
    return [];
  }
  
  return fetchMarketData(coinIds, vsCurrency, coinIds.length);
}

/**
 * Get full list of all coins from CoinGecko
 * This is useful for search functionality
 */
export async function fetchCoinsList(): Promise<CoinListItem[]> {
  // Check cache (this endpoint doesn't change often, can cache longer)
  if (coinListCache && isCacheValid(coinListCache)) {
    return coinListCache.data;
  }

  try {
    const url = `${COINGECKO_API_BASE}/coins/list`;
    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data: CoinListItem[] = await response.json();
    
    // Cache the response
    coinListCache = {
      data,
      timestamp: Date.now(),
    };
    
    return data;
  } catch (error) {
    console.error('Failed to fetch coins list from CoinGecko:', error);
    
    // Return cached data even if expired
    if (coinListCache) {
      return coinListCache.data;
    }
    
    throw error;
  }
}

/**
 * Get detailed information for a specific coin
 * @param coinId CoinGecko ID (e.g., 'bitcoin', 'ethereum')
 */
export async function fetchCoinDetails(coinId: string): Promise<CoinDetails> {
  const cacheKey = coinId.toLowerCase();
  const cached = coinDetailsCache.get(cacheKey);
  
  if (cached && isCacheValid(cached)) {
    return cached.data;
  }

  try {
    const url = `${COINGECKO_API_BASE}/coins/${coinId}`;
    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data: CoinDetails = await response.json();
    
    // Cache the response
    coinDetailsCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
    
    return data;
  } catch (error) {
    console.error(`Failed to fetch coin details for ${coinId}:`, error);
    
    // Return cached data even if expired
    if (cached) {
      return cached.data;
    }
    
    throw error;
  }
}

/**
 * Get coin price by symbol
 * Quick helper function to get just the price
 */
export async function getCoinPrice(symbol: string, vsCurrency: string = 'usd'): Promise<number | null> {
  try {
    const coinId = getCoinId(symbol);
    if (!coinId) {
      return null;
    }
    
    const marketData = await fetchMarketDataBySymbols([symbol], vsCurrency);
    
    if (marketData.length > 0) {
      return marketData[0].current_price;
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to get price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Calculate exchange rate between two coins
 */
export async function calculateExchangeRate(
  fromSymbol: string,
  toSymbol: string
): Promise<number | null> {
  try {
    const marketData = await fetchMarketDataBySymbols([fromSymbol, toSymbol]);
    
    if (marketData.length < 2) {
      return null;
    }
    
    const fromCoin = marketData.find(coin => coin.symbol.toLowerCase() === fromSymbol.toLowerCase());
    const toCoin = marketData.find(coin => coin.symbol.toLowerCase() === toSymbol.toLowerCase());
    
    if (!fromCoin || !toCoin) {
      return null;
    }
    
    // Exchange rate = (fromCoin price) / (toCoin price)
    return fromCoin.current_price / toCoin.current_price;
  } catch (error) {
    console.error(`Failed to calculate exchange rate from ${fromSymbol} to ${toSymbol}:`, error);
    return null;
  }
}

/**
 * Search for coins by name or symbol
 * Only returns supported coins
 */
export async function searchCoins(query: string): Promise<CoinMarketData[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    // Only fetch supported coins
    const { getUniqueCoinGeckoIds } = await import('./supportedAssets');
    const supportedIds = getUniqueCoinGeckoIds();
    
    if (supportedIds.length === 0) {
      return [];
    }
    
    const allCoins = await fetchMarketData(supportedIds, 'usd', supportedIds.length);
    const lowerQuery = query.toLowerCase();
    
    return allCoins.filter(coin => 
      coin.name.toLowerCase().includes(lowerQuery) ||
      coin.symbol.toLowerCase().includes(lowerQuery) ||
      coin.id.toLowerCase().includes(lowerQuery)
    ).slice(0, 20); // Limit to top 20 results
  } catch (error) {
    console.error('Failed to search coins:', error);
    return [];
  }
}
