import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getAffiliateByUserId, getReferrals } from '@/lib/db-affiliate';
import { getUserById } from '@/lib/db';

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
        referrals: [],
      });
    }

    const referrals = await getReferrals(affiliate.id);
    
    // Enrich with user emails
    const enrichedReferrals = await Promise.all(
      referrals.map(async (ref) => {
        const user = await getUserById(ref.referredUserId);
        return {
          ...ref,
          referredUserEmail: user?.email || 'Unknown',
        };
      })
    );

    return NextResponse.json({
      success: true,
      referrals: enrichedReferrals,
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}








