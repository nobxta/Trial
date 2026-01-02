import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { getDisputeById, updateDisputeStatus } from '@/lib/db-chat';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const disputeId = params.id;
    const body = await request.json();
    const status = body.status;

    if (!status || !['open', 'waiting', 'closed', 'deleted', 'investigating', 'resolved'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    const dispute = await getDisputeById(disputeId);
    
    if (!dispute) {
      return NextResponse.json(
        { success: false, error: 'Dispute not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to delete (super admin only)
    if (status === 'deleted' && admin.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only super admins can delete chats' },
        { status: 403 }
      );
    }

    await updateDisputeStatus(disputeId, status, admin.id);

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error: any) {
    console.error('Error updating status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update status' },
      { status: 500 }
    );
  }
}

