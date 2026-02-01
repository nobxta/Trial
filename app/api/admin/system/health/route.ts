import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import {
  getNowPaymentsLiveApiKey,
  getNowPaymentsLiveIpnSecret,
} from '@/lib/env';

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const health = {
      webhook: 'unknown' as 'healthy' | 'unhealthy' | 'unknown',
      nowpayments: 'unknown' as 'healthy' | 'unhealthy' | 'unknown',
      timestamp: new Date().toISOString(),
    };

    try {
      const apiKey = getNowPaymentsLiveApiKey();
      if (apiKey) {
        const response = await fetch('https://api.nowpayments.io/v1/status', {
          headers: { 'x-api-key': apiKey },
        });
        health.nowpayments = response.ok ? 'healthy' : 'unhealthy';
      } else {
        health.nowpayments = 'unhealthy';
      }
    } catch {
      health.nowpayments = 'unhealthy';
    }

    health.webhook = getNowPaymentsLiveIpnSecret() ? 'healthy' : 'unhealthy';

    return NextResponse.json(health);
  } catch (error: any) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

