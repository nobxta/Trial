import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { getDisputeById, addChatMessage } from '@/lib/db-chat';

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
    const message = body.message?.trim();

    if (!message || message.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Message too long (max 5000 characters)' },
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

    // Add admin message
    const newMessage = await addChatMessage(disputeId, 'admin', message);

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}

