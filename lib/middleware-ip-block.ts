import { NextRequest, NextResponse } from 'next/server';
import { isIPBlocked, getClientIP } from './ip-blocking';

// Re-export getClientIP for convenience
export { getClientIP };

/**
 * Middleware to check if IP is blocked
 * Use this in your API routes or middleware.ts
 */
export async function checkIPBlocked(request: NextRequest): Promise<NextResponse | null> {
  try {
    const ip = getClientIP(request);
    
    // Skip check for 'unknown' IP (development/local)
    if (ip === 'unknown') {
      return null;
    }

    const blocked = await isIPBlocked(ip);
    
    if (blocked) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'Your IP address has been blocked from accessing this service.'
        },
        { status: 403 }
      );
    }

    return null; // IP is not blocked, continue
  } catch (error) {
    // If there's an error checking, allow through (fail open)
    // In production, you might want to fail closed
    console.error('Error checking IP block:', error);
    return null;
  }
}

