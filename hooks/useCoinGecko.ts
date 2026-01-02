"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchMarketData, fetchMarketDataBySymbols, CoinMarketData } from '@/lib/coingecko';

interface UseCoinGeckoOptions {
  limit?: number;
  coinIds?: string[];
  coinSymbols?: string[];
  vsCurrency?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseCoinGeckoReturn {
  coins: CoinMarketData[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdated: number | null;
}

const DEFAULT_REFRESH_INTERVAL = 60000; // 60 seconds

/**
 * Custom React hook for fetching and managing CoinGecko market data
 * 
 * @param options Configuration options
 * @returns Object containing coins array, loading state, error, refresh function, and lastUpdated timestamp
 */
export function useCoinGecko(options: UseCoinGeckoOptions = {}): UseCoinGeckoReturn {
  const {
    limit = 100,
    coinIds,
    coinSymbols,
    vsCurrency = 'usd',
    autoRefresh = true,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
  } = options;

  const [coins, setCoins] = useState<CoinMarketData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      let data: CoinMarketData[];

      if (coinSymbols && coinSymbols.length > 0) {
        // Fetch by symbols (auto-converts to coin IDs)
        data = await fetchMarketDataBySymbols(coinSymbols, vsCurrency);
      } else if (coinIds && coinIds.length > 0) {
        // Fetch by coin IDs
        data = await fetchMarketData(coinIds, vsCurrency, coinIds.length);
      } else {
        // Fetch top coins by market cap
        data = await fetchMarketData(undefined, vsCurrency, limit);
      }

      if (isMountedRef.current) {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCoinGecko.ts:45',message:'Coins data received',data:{coinCount:data.length,coinSymbols:data.map(c=>c.symbol).slice(0,10),sampleCoinId:data[0]?.id,sampleCoinSymbol:data[0]?.symbol,sampleCoinImage:data[0]?.image?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
        // #endregion
        setCoins(data);
        setLastUpdated(Date.now());
        setLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error('Failed to fetch coin data');
        setError(error);
        setLoading(false);
        
        // Keep existing coins if available (for graceful degradation)
        if (coins.length === 0) {
          setCoins([]);
        }
      }
    }
  }, [coinIds, coinSymbols, vsCurrency, limit, coins.length]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchData();
  }, [fetchData]);

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    // Set up auto-refresh interval
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          fetchData();
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
  }, [fetchData, autoRefresh, refreshInterval]);

  return {
    coins,
    loading,
    error,
    refresh,
    lastUpdated,
  };
}

/**
 * Hook variant for fetching specific coins by symbols
 * Convenience hook that wraps useCoinGecko with coinSymbols
 */
export function useCoinGeckoBySymbols(
  symbols: string[],
  options: Omit<UseCoinGeckoOptions, 'coinSymbols'> = {}
): UseCoinGeckoReturn {
  return useCoinGecko({
    ...options,
    coinSymbols: symbols,
  });
}

/**
 * Hook variant for fetching specific coins by IDs
 * Convenience hook that wraps useCoinGecko with coinIds
 */
export function useCoinGeckoByIds(
  ids: string[],
  options: Omit<UseCoinGeckoOptions, 'coinIds'> = {}
): UseCoinGeckoReturn {
  return useCoinGecko({
    ...options,
    coinIds: ids,
  });
}

