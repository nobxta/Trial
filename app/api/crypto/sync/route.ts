import { NextRequest, NextResponse } from 'next/server';
import { normalizeCurrency, fetchNowPaymentsCurrencies } from '@/scripts/fetch-and-normalize-currencies';
import fs from 'fs';
import path from 'path';

/**
 * API route to sync currencies from NOWPayments
 * POST /api/crypto/sync
 * 
 * This endpoint fetches currencies from NOWPayments API,
 * normalizes them, and saves to supportedCoins.json
 */
export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    const apiKey = process.env.NOWPAYMENTS_API_KEY || process.env.NEXT_PUBLIC_NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'NOWPAYMENTS_API_KEY is not configured' },
        { status: 500 }
      );
    }

    console.log('🔄 Fetching currencies from NOWPayments...');
    const currencyIds = await fetchNowPaymentsCurrencies();
    console.log(`✅ Fetched ${currencyIds.length} currencies from NOWPayments`);

    // Load CoinGecko mapping
    const coingeckoMapPath = path.join(process.cwd(), 'data', 'coingeckoMap.json');
    let coingeckoMap: Record<string, string> = {};
    try {
      const mapContent = fs.readFileSync(coingeckoMapPath, 'utf-8');
      coingeckoMap = JSON.parse(mapContent);
    } catch (error) {
      console.warn('Failed to load CoinGecko map, continuing without it');
    }

    // Normalize currencies
    const normalized = [];
    const skipped: string[] = [];

    for (const id of currencyIds) {
      const normalizedCrypto = normalizeCurrency(id, coingeckoMap);
      if (normalizedCrypto) {
        normalized.push(normalizedCrypto);
      } else {
        skipped.push(id);
      }
    }

    // Save to file
    const outputPath = path.join(process.cwd(), 'data', 'supportedCoins.json');
    fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      total: normalized.length,
      withCoinGecko: normalized.filter((c: any) => c.coingeckoId).length,
      withoutCoinGecko: normalized.filter((c: any) => c.coingeckoId === null).length,
      skipped: skipped.length,
      message: `Successfully synced ${normalized.length} currencies`,
    });
  } catch (error: any) {
    console.error('Failed to sync currencies:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync currencies' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check sync status
 */
export async function GET(request: NextRequest) {
  try {
    const supportedCoinsPath = path.join(process.cwd(), 'data', 'supportedCoins.json');
    
    if (!fs.existsSync(supportedCoinsPath)) {
      return NextResponse.json({
        synced: false,
        message: 'No supported coins file found. Run POST /api/crypto/sync to sync currencies.',
      });
    }

    const content = fs.readFileSync(supportedCoinsPath, 'utf-8');
    const coins = JSON.parse(content);

    return NextResponse.json({
      synced: true,
      total: coins.length,
      withCoinGecko: coins.filter((c: any) => c.coingeckoId).length,
      withoutCoinGecko: coins.filter((c: any) => c.coingeckoId === null).length,
      lastUpdated: fs.statSync(supportedCoinsPath).mtime.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check sync status' },
      { status: 500 }
    );
  }
}

