import { supabaseAdmin } from './supabase';
import { NextRequest } from 'next/server';

/**
 * Log user login attempt
 */
export async function logUserLogin(
  userId: string,
  request: NextRequest,
  success: boolean,
  failureReason?: string
): Promise<void> {
  if (!supabaseAdmin) {
    console.warn('Supabase not configured, skipping login log');
    return;
  }

  try {
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.headers.get('x-client-ip') ||
                     'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Extract country from IP (basic - in production, use a geolocation service)
    // For now, we'll leave it null and can enhance later
    const country = null;
    const city = null;

    await supabaseAdmin!
      .from('user_login_logs')
      .insert({
        user_id: userId,
        ip_address: ipAddress.split(',')[0].trim(), // Take first IP if multiple
        user_agent: userAgent,
        country,
        city,
        success,
        failure_reason: failureReason || null,
      });
  } catch (error) {
    // Don't fail login if logging fails
    console.error('Failed to log user login:', error);
  }
}

