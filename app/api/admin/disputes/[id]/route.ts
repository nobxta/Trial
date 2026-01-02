import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { getDisputeById, updateDisputeStatus } from '@/lib/db-chat';

export async function DELETE(
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

    // Only super admins can delete
    if (admin.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only super admins can delete chats' },
        { status: 403 }
      );
    }

    const disputeId = params.id;
    const dispute = await getDisputeById(disputeId);
    
    if (!dispute) {
      return NextResponse.json(
        { success: false, error: 'Dispute not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting status to deleted
    await updateDisputeStatus(disputeId, 'deleted', admin.id);

    return NextResponse.json({
      success: true,
      message: 'Chat deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete chat' },
      { status: 500 }
    );
  }
}
