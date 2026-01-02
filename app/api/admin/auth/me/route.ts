import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';

export async function GET() {
  try {
    const admin = await getAdminUser();
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      admin: {
        id: admin.adminId,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error: any) {
    console.error('Get admin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

