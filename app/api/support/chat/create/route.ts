import { NextRequest, NextResponse } from 'next/server';
import { createLiveChat, hashIP } from '@/lib/db-chat';
import { checkIPBlocked, getClientIP } from '@/lib/middleware-ip-block';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Check if IP is blocked
    const ipBlockCheck = await checkIPBlocked(request);
    if (ipBlockCheck) {
      return ipBlockCheck;
    }

    const body = await request.json();
    const userEmail = body.email || undefined;
    const issue = body.issue || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    const ip = getClientIP(request);
    const ipHash = hashIP(ip);

    // Issue is required to create a chat
    if (!issue || issue.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Issue description is required (minimum 5 characters)' },
        { status: 400 }
      );
    }

    // Create new chat with issue
    const chat = await createLiveChat(userEmail, userAgent, ipHash, issue.trim());

    // Set cookie
    const response = NextResponse.json({ 
      success: true, 
      chat_id: chat.chat_id,
      status: chat.status 
    });

    response.cookies.set('support_chat_id', chat.chat_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create chat' },
      { status: 500 }
    );
  }
}

