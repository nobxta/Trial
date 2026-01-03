import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getAffiliateByUserId, createAffiliate } from '@/lib/db-affiliate';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    let affiliate = await getAffiliateByUserId(authUser.userId);
    
    // Create affiliate if doesn't exist
    if (!affiliate) {
      affiliate = await createAffiliate(authUser.userId);
    }

    return NextResponse.json({
      success: true,
      affiliate,
    });
  } catch (error: any) {
    console.error('Get affiliate error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}









