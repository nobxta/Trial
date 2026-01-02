"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

interface CryptoPrice {
  usd: number;
  usd_24h_change?: number;
}

interface UseCryptoPricesReturn {
  prices: Record<string, CryptoPrice>;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdated: number | null;
}

const DEFAULT_REFRESH_INTERVAL = 20000; // 20 seconds (matches cache TTL)

/**
 * Custom React hook for fetching crypto prices from our backend API
 * Prices are cached in the database and updated every 10 minutes by a cron job
 * The API returns cached prices instantly, refreshing on-demand if stale (>10 min)
 * @param autoRefresh - Whether to auto-refresh prices (recommended: true)
 * @param refreshInterval - Refresh interval in milliseconds (for polling cache)
 * @param coinIds - Optional array of CoinGecko IDs to filter (if not provided, fetches all cached prices)
 */
export function useCryptoPrices(
  autoRefresh: boolean = true,
  refreshInterval: number = DEFAULT_REFRESH_INTERVAL,
  coinIds?: string[]
): UseCryptoPricesReturn {
  const [prices, setPrices] = useState<Record<string, CryptoPrice>>({});
  const [loading, setLoading] = useState<boolean>(false); // Start as false - only true during initial fetch
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const pricesRef = useRef<Record<string, CryptoPrice>>({});
  
  // Keep pricesRef in sync with prices state
  useEffect(() => {
    pricesRef.current = prices;
  }, [prices]);

  const fetchPrices = useCallback(async () => {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCryptoPrices.ts:42',message:'fetchPrices called',data:{timestamp:Date.now(),coinIds:coinIds?.join(',')||'all'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,E'})}).catch(()=>{});
      // #endregion
    try {
      setError(null);
      // Only set loading to true on initial fetch (when no prices exist)
      // This prevents UI blocking on subsequent refreshes
      const isInitialLoad = Object.keys(pricesRef.current).length === 0;
      if (isInitialLoad) {
        setLoading(true);
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCryptoPrices.ts:40',message:'Fetching prices API',data:{url:'/api/crypto/prices'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Build URL with optional coinIds parameter
      const url = coinIds && coinIds.length > 0
        ? `/api/crypto/prices?ids=${coinIds.join(',')}`
        : '/api/crypto/prices';
      
      const response = await fetch(url);
      
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCryptoPrices.ts:44',message:'API response received',data:{ok:response.ok,status:response.status,statusText:response.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCryptoPrices.ts:52',message:'Prices data received',data:{pricesCount:Object.keys(data.prices||{}).length,hasError:!!data.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (isMountedRef.current) {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCryptoPrices.ts:55',message:'Updating prices state',data:{newPricesCount:Object.keys(data.prices||{}).length,oldPricesCount:Object.keys(prices).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        // Merge new prices with existing ones to keep previous data
        const mergedPrices = { ...pricesRef.current, ...(data.prices || {}) };
        setPrices(mergedPrices);
        setLastUpdated(data.timestamp || Date.now());
        setLoading(false);
      }
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCryptoPrices.ts:62',message:'fetchPrices error',data:{error:err instanceof Error?err.message:String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error('Failed to fetch crypto prices');
        setError(error);
        setLoading(false);
        
        // Always keep existing prices on error (never clear them)
        // Prices will remain from previous successful fetch
      }
    }
    // Include coinIds in dependency array so it refetches when displayed cryptos change
  }, [coinIds]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchPrices();
  }, [fetchPrices]);

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCryptoPrices.ts:72',message:'useEffect running',data:{autoRefresh,refreshInterval},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,E'})}).catch(()=>{});
    // #endregion
    isMountedRef.current = true;
    fetchPrices();

    // Set up auto-refresh interval
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          fetchPrices();
        }
      }, refreshInterval);
    }

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchPrices, autoRefresh, refreshInterval]);

  return {
    prices,
    loading,
    error,
    refresh,
    lastUpdated,
  };
}

