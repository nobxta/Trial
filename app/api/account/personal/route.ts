import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserWithPreferences } from '@/lib/db';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await getUserWithPreferences(authUser.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get last visit from user data (for now, use created_at as fallback)
    // In production, you'd track this separately
    return NextResponse.json({
      success: true,
      user: {
        ...user,
        lastVisit: user.createdAt, // This would be tracked separately in production
      },
    });
  } catch (error) {
    console.error('Get user preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

