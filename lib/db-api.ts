import { supabaseAdmin } from './supabase';
import crypto from 'crypto';

function checkSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
}

export async function generateApiKey(userId: string): Promise<string> {
  checkSupabase();

  // Generate secure API key
  const apiKey = 'mm_' + crypto.randomBytes(32).toString('hex');

  const { error } = await supabaseAdmin!
    .from('users')
    .update({ api_key: apiKey })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to generate API key: ${error.message}`);
  }

  return apiKey;
}

export async function getApiKey(userId: string): Promise<string | null> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('users')
    .select('api_key')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return data.api_key;
}

export async function revokeApiKey(userId: string): Promise<boolean> {
  checkSupabase();

  const { error } = await supabaseAdmin!
    .from('users')
    .update({ api_key: null })
    .eq('id', userId);

  return !error;
}

export function maskApiKey(apiKey: string | null): string {
  if (!apiKey) return '';
  if (apiKey.length <= 12) return apiKey;
  return apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
}

