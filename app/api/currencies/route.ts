import { NextRequest, NextResponse } from 'next/server';
import { getEnabledAssetNetworks } from '@/lib/supportedAssets';

/**
 * GET /api/currencies
 * Returns list of supported currency IDs (NOWPayments compatible)
 * Uses supportedAssets.ts as single source of truth
 */
export async function GET(request: NextRequest) {
  try {
    // Get all enabled asset networks
    const assets = getEnabledAssetNetworks();
    
    // Return NOWPayments compatible IDs
    const currencyIds = assets.map(asset => asset.id);
    
    return NextResponse.json({ 
      currencies: currencyIds,
      total: currencyIds.length,
    });
  } catch (error: any) {
    console.error('Failed to get supported currencies:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to load supported currencies',
        currencies: [], // Return empty array, not fallback
      },
      { status: 500 }
    );
  }
}
