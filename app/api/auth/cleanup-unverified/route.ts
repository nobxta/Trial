import { NextRequest, NextResponse } from 'next/server';
import { cleanupUnverifiedAccounts } from '@/lib/cleanup';

/**
 * Cleanup unverified accounts older than 1 hour
 * This should be called periodically (e.g., via cron job or scheduled task)
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add secret for security (recommended for production)
    const authHeader = request.headers.get('authorization');
    const cleanupSecret = process.env.CLEANUP_SECRET;
    
    if (cleanupSecret && authHeader !== `Bearer ${cleanupSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const deletedCount = await cleanupUnverifiedAccounts();

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} unverified account(s)`,
      deletedCount,
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also allow GET for easier testing (only in development)
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Not allowed in production' },
      { status: 403 }
    );
  }
  
  const request = new NextRequest('http://localhost/api/auth/cleanup-unverified', { method: 'POST' });
  return POST(request);
}

