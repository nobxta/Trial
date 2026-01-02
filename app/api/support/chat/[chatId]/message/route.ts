import { NextRequest, NextResponse } from 'next/server';
import { 
  getChatByChatId, 
  addChatMessageByChatId,
  updateSessionLastActive,
  hashIP
} from '@/lib/db-chat';
import { checkIPBlocked, getClientIP } from '@/lib/middleware-ip-block';

export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    // Check if IP is blocked
    const ipBlockCheck = await checkIPBlocked(request);
    if (ipBlockCheck) {
      return ipBlockCheck;
    }

    const chatId = params.chatId;
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

    const chat = await getChatByChatId(chatId);
    
    if (!chat) {
      return NextResponse.json(
        { success: false, error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Check if chat is closed or deleted
    if (chat.status === 'closed' || chat.status === 'deleted') {
      return NextResponse.json(
        { success: false, error: 'This chat is closed' },
        { status: 403 }
      );
    }

    // Update session last active
    const ip = getClientIP(request);
    const ipHash = hashIP(ip);
    await updateSessionLastActive(chatId, ipHash);

    // Add message
    const newMessage = await addChatMessageByChatId(chatId, 'user', message);

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

