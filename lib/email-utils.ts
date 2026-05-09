import { NextRequest } from 'next/server';
import { getPublicBaseUrl, isProductionEnv } from './env';

/**
 * Get the base URL for the application
 * Automatically detects from request headers or uses validated env
 */
export function getBaseUrl(request?: NextRequest): string {
  // Production links must come from configured canonical origin, never request
  // headers, so verification tokens cannot be sent inside Host-spoofed URLs.
  if (typeof window === 'undefined' && isProductionEnv()) {
    return getPublicBaseUrl();
  }

  // If we have a request, use the host from headers
  if (request) {
    const protocol =
      request.headers.get('x-forwarded-proto') ||
      (request.url.startsWith('https') ? 'https' : 'http');
    const host =
      request.headers.get('host') || request.headers.get('x-forwarded-host');
    if (host) {
      return `${protocol}://${host}`;
    }
  }

  // Use centralized env (validated PUBLIC_BASE_URL or dev default)
  if (typeof window === 'undefined') {
    return getPublicBaseUrl();
  }

  // Client fallback (NEXT_PUBLIC_APP_URL is safe to read on client)
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (publicUrl) return publicUrl;
  return isProductionEnv() ? 'https://yourdomain.com' : 'http://localhost:3000';
}

