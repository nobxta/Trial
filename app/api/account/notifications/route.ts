import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { updateUserPreferences } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { enabled } = await request.json();

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enabled must be a boolean' },
        { status: 400 }
      );
    }

    const success = await updateUserPreferences(authUser.userId, {
      notificationsEnabled: enabled,
    });

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update notifications preference' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notificationsEnabled: enabled,
    });
  } catch (error) {
    console.error('Update notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

