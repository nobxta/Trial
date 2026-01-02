/**
 * AMOUNT FORMATTING AND VALIDATION
 * 
 * Provides utilities for formatting crypto amounts and validating
 * that amounts are reasonable for their currency type.
 */

/**
 * Format crypto amount with appropriate decimal places
 * 
 * @param amount - Amount to format
 * @param symbol - Currency symbol (e.g., 'ETH', 'BTC', 'USDT')
 * @returns Formatted amount string
 */
export function formatCryptoAmount(amount: number | string, symbol: string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return '0';
  }
  
  const upperSymbol = symbol.toUpperCase();
  
  // High-value coins (BTC, ETH) - 4-6 decimals
  if (upperSymbol === 'BTC' || upperSymbol === 'ETH') {
    // If amount is very small (< 0.01), show more decimals
    if (numAmount < 0.01) {
      return numAmount.toFixed(6);
    }
    // If amount is small (< 1), show 4 decimals
    if (numAmount < 1) {
      return numAmount.toFixed(4);
    }
    // If amount is large, show 2 decimals
    return numAmount.toFixed(2);
  }
  
  // Stablecoins (USDT, USDC) - 2-6 decimals
  if (upperSymbol === 'USDT' || upperSymbol === 'USDC' || upperSymbol === 'BUSD') {
    // If amount is very small (< 0.01), show more decimals
    if (numAmount < 0.01) {
      return numAmount.toFixed(6);
    }
    // Standard: 2 decimals
    return numAmount.toFixed(2);
  }
  
  // Default: 4-6 decimals based on amount
  if (numAmount < 0.01) {
    return numAmount.toFixed(6);
  }
  if (numAmount < 1) {
    return numAmount.toFixed(4);
  }
  return numAmount.toFixed(2);
}

/**
 * Validate that a crypto amount is reasonable for its currency
 * 
 * @param amount - Amount to validate
 * @param symbol - Currency symbol
 * @returns true if amount is reasonable, false otherwise
 */
export function validateCryptoAmount(amount: number | string, symbol: string): boolean {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return false;
  }
  
  const upperSymbol = symbol.toUpperCase();
  
  // High-value coins: flag if amount > 100 (likely a unit error)
  if (upperSymbol === 'BTC' || upperSymbol === 'ETH') {
    if (numAmount > 100) {
      console.error(`🚨 CRITICAL: Suspicious amount detected: ${numAmount} ${upperSymbol}. This is likely a unit error (USD displayed as crypto).`);
      return false;
    }
  }
  
  // Stablecoins: flag if amount > 1,000,000 (likely a unit error)
  if (upperSymbol === 'USDT' || upperSymbol === 'USDC' || upperSymbol === 'BUSD') {
    if (numAmount > 1000000) {
      console.error(`🚨 CRITICAL: Suspicious amount detected: ${numAmount} ${upperSymbol}. This is likely a unit error.`);
      return false;
    }
  }
  
  return true;
}

/**
 * Format USD amount
 */
export function formatUsdAmount(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

