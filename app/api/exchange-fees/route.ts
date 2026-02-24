/**
 * Public GET /api/exchange-fees — returns fixed and floating fee percentages for the widget.
 * No auth required so the exchange widget can fetch fees before order creation.
 */

import { NextResponse } from 'next/server';
import { getExchangeFeeSettings } from '@/lib/db-exchange-fees';

export async function GET() {
  try {
    const settings = await getExchangeFeeSettings();
    return NextResponse.json({
      success: true,
      fixedFeePercent: settings.fixedFeePercent,
      floatingFeePercent: settings.floatingFeePercent,
    });
  } catch (error: any) {
    console.error('Exchange fees fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch exchange fees' },
      { status: 500 }
    );
  }
}
