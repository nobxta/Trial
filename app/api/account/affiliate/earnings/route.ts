import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getAffiliateByUserId, getEarningsHistory } from '@/lib/db-affiliate';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const affiliate = await getAffiliateByUserId(authUser.userId);
    if (!affiliate) {
      return NextResponse.json({
        success: true,
        earnings: [],
      });
    }

    const earnings = await getEarningsHistory(affiliate.id);

    return NextResponse.json({
      success: true,
      earnings,
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}












