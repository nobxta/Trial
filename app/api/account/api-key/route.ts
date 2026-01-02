import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getApiKey, generateApiKey, revokeApiKey, maskApiKey } from '@/lib/db-api';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const apiKey = await getApiKey(authUser.userId);

    return NextResponse.json({
      success: true,
      apiKey,
    });
  } catch (error) {
    console.error('Get API key error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    if (action === 'generate') {
      const apiKey = await generateApiKey(authUser.userId);
      return NextResponse.json({
        success: true,
        apiKey,
      });
    } else if (action === 'revoke') {
      const success = await revokeApiKey(authUser.userId);
      return NextResponse.json({
        success,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('API key operation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

