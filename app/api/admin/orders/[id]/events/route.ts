import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { getEntityEventLog } from '@/lib/db-admin-logs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminRole('viewer');
    const events = await getEntityEventLog('order', params.id);
    return NextResponse.json({ events });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Get order events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

