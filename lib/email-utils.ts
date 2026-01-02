import { NextRequest } from 'next/server';

/**
 * Get the base URL for the application
 * Automatically detects from request headers or uses environment variable
 */
export function getBaseUrl(request?: NextRequest): string {
  // If we have a request, use the host from headers
  if (request) {
    const protocol = request.headers.get('x-forwarded-proto') || 
                     (request.url.startsWith('https') ? 'https' : 'http');
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
    if (host) {
      return `${protocol}://${host}`;
    }
  }

  // Fallback to environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  // Production fallback (shouldn't reach here if properly configured)
  return 'https://yourdomain.com';
}

