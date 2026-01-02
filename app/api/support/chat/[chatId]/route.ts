import { NextRequest, NextResponse } from 'next/server';
import { getChatByChatId, getChatMessagesByChatId } from '@/lib/db-chat';
import { checkIPBlocked } from '@/lib/middleware-ip-block';

export async function GET(
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

    if (!chatId) {
      return NextResponse.json(
        { success: false, error: 'Chat ID required' },
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

    // Don't return deleted chats
    if (chat.status === 'deleted') {
      return NextResponse.json(
        { success: false, error: 'This chat has been closed by support' },
        { status: 403 }
      );
    }

    const messages = await getChatMessagesByChatId(chatId);

    return NextResponse.json({
      success: true,
      chat: {
        chat_id: chat.chat_id,
        status: chat.status,
        type: chat.type,
        created_at: chat.created_at,
        last_message_at: chat.last_message_at,
      },
      messages,
    });
  } catch (error: any) {
    console.error('Error getting chat:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get chat' },
      { status: 500 }
    );
  }
}

