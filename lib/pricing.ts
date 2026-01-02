// Pricing logic for payment widget
// Uses CoinGecko API service for all price fetching

import { getCoinPrice as fetchCoinPrice, calculateExchangeRate, fetchMarketDataBySymbols, CoinMarketData } from './coingecko';

interface PriceData {
  btcPrice: number; // BTC price in USDT
  timestamp: number;
}

let cachedPrice: PriceData | null = null;
const PRICE_CACHE_DURATION = 60000; // 1 minute

// Fetch live BTC/USDT price
export async function fetchBTCPrice(): Promise<number> {
  try {
    // Use CoinGecko service to get BTC price
    const price = await fetchCoinPrice('BTC', 'usd');
    
    if (price !== null) {
      cachedPrice = { btcPrice: price, timestamp: Date.now() };
      return price;
    }
    
    // Fallback to cached price or default
    if (cachedPrice && Date.now() - cachedPrice.timestamp < PRICE_CACHE_DURATION) {
      return cachedPrice.btcPrice;
    }
    
    // Default fallback
    return 86881.112;
  } catch (error) {
    console.error('Failed to fetch BTC price:', error);
    // Return cached or default
    return cachedPrice?.btcPrice || 86881.112;
  }
}

// Calculate USD value from BTC amount
export function calculateUSDValue(btcAmount: number, btcPrice: number): number {
  return btcAmount * btcPrice;
}

// Calculate required BTC from USD target
export function calculateRequiredBTC(usdTarget: number, btcPrice: number): number {
  return usdTarget / btcPrice;
}

// Apply fee
export function applyFee(amount: number, feePercent: number): number {
  return amount * (1 - feePercent / 100);
}

/**
 * Get coin price by symbol using CoinGecko
 * @param symbol Coin symbol (e.g., 'BTC', 'ETH')
 * @param vsCurrency Currency to compare against (default: 'usd')
 * @returns Price in the specified currency, or null if not found
 */
export async function getCoinPrice(symbol: string, vsCurrency: string = 'usd'): Promise<number | null> {
  try {
    return await fetchCoinPrice(symbol, vsCurrency);
  } catch (error) {
    console.error(`Failed to get price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Calculate exchange rate between two coins
 * @param fromSymbol Source coin symbol (e.g., 'BTC')
 * @param toSymbol Target coin symbol (e.g., 'ETH')
 * @returns Exchange rate (how many toCoin per fromCoin), or null if calculation fails
 */
export async function getExchangeRate(fromSymbol: string, toSymbol: string): Promise<number | null> {
  try {
    return await calculateExchangeRate(fromSymbol, toSymbol);
  } catch (error) {
    console.error(`Failed to calculate exchange rate from ${fromSymbol} to ${toSymbol}:`, error);
    return null;
  }
}

/**
 * Get market data for multiple coins by symbols
 * @param symbols Array of coin symbols
 * @param vsCurrency Currency to compare against (default: 'usd')
 * @returns Array of coin market data
 */
export async function getMarketData(symbols: string[], vsCurrency: string = 'usd'): Promise<CoinMarketData[]> {
  try {
    return await fetchMarketDataBySymbols(symbols, vsCurrency);
  } catch (error) {
    console.error('Failed to fetch market data:', error);
    return [];
  }
}

