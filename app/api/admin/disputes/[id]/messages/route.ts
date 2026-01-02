import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { getDisputeById, getChatMessages, markMessagesAsRead } from '@/lib/db-chat';

export async function GET(
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
    const dispute = await getDisputeById(disputeId);

    if (!dispute) {
      return NextResponse.json(
        { success: false, error: 'Dispute not found' },
        { status: 404 }
      );
    }

    const messages = await getChatMessages(disputeId);
    
    // Mark user messages as read
    await markMessagesAsRead(disputeId, 'admin');

    return NextResponse.json({
      success: true,
      messages,
      dispute: {
        id: dispute.id,
        chat_id: dispute.chat_id,
        type: dispute.type,
        status: dispute.status,
        user_email: dispute.user_email,
        created_at: dispute.created_at,
        last_message_at: dispute.last_message_at,
      },
    });
  } catch (error: any) {
    console.error('Error getting messages:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get messages' },
      { status: 500 }
    );
  }
}

