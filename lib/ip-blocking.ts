import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from './env';

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseServiceRoleKey();
// Server-only: env validation ensures url/key are set when app runs.
const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;
const supabaseClient = supabase!;

export interface BlockedIP {
  id: string;
  ip_address: string;
  ip_hash: string | null;
  reason: string;
  blocked_by: string;
  blocked_at: string;
  expires_at: string | null;
  is_active: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hash IP address for privacy
 */
export function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Check if an IP address is blocked
 */
export async function isIPBlocked(ip: string): Promise<boolean> {
  const now = new Date().toISOString();
  const ipHash = hashIP(ip);

  // Check by exact IP address - active blocks that haven't expired
  const { data: exactMatch } = await supabaseClient
    .from('blocked_ips')
    .select('id')
    .eq('ip_address', ip)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .limit(1)
    .maybeSingle();

  if (exactMatch) return true;

  // Also check by IP hash (for privacy) - active blocks that haven't expired
  const { data: hashMatch } = await supabaseClient
    .from('blocked_ips')
    .select('id')
    .eq('ip_hash', ipHash)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .limit(1)
    .maybeSingle();

  return !!hashMatch;
}

/**
 * Block an IP address
 */
export async function blockIP(
  ip: string,
  reason: string,
  adminId: string,
  expiresAt?: Date,
  metadata?: Record<string, any>
): Promise<BlockedIP> {
  const ipHash = hashIP(ip);

  const { data, error } = await supabaseClient
    .from('blocked_ips')
    .insert({
      ip_address: ip,
      ip_hash: ipHash,
      reason,
      blocked_by: adminId,
      expires_at: expiresAt?.toISOString() || null,
      is_active: true,
      metadata: metadata || null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to block IP: ${error?.message}`);
  }

  return data as BlockedIP;
}

/**
 * Unblock an IP address
 */
export async function unblockIP(ip: string): Promise<boolean> {
  const { error } = await supabaseClient
    .from('blocked_ips')
    .update({ is_active: false })
    .eq('ip_address', ip)
    .or(`ip_hash.eq.${hashIP(ip)}`);

  return !error;
}

/**
 * Get all blocked IPs
 */
export async function getAllBlockedIPs(includeInactive: boolean = false): Promise<BlockedIP[]> {
  let query = supabaseClient
    .from('blocked_ips')
    .select('*')
    .order('blocked_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get blocked IPs: ${error.message}`);
  return (data || []) as BlockedIP[];
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request | { headers: Headers }): string {
  const headers = request.headers;
  const forwarded = headers.get('x-forwarded-for');
  const realIP = headers.get('x-real-ip');
  const clientIP = headers.get('x-client-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP.trim();
  }
  if (clientIP) {
    return clientIP.trim();
  }
  
  return 'unknown';
}

