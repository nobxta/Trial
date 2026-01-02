import { supabaseAdmin } from './supabase';

// Simple in-memory cache per process (cleared on server restart)
const cache: Map<string, string> = new Map();
let cacheInitialized = false;

/**
 * Initialize cache by loading all settings from database
 */
async function initializeCache(): Promise<void> {
  if (cacheInitialized) return;
  
  if (!supabaseAdmin) {
    console.warn('⚠️  Supabase not configured, email settings cache not initialized');
    cacheInitialized = true;
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('email_settings')
      .select('key, value');

    if (error) {
      console.error('❌ Failed to load email settings:', error);
      cacheInitialized = true;
      return;
    }

    if (data) {
      cache.clear();
      for (const setting of data) {
        cache.set(setting.key, setting.value);
      }
    }

    cacheInitialized = true;
  } catch (error) {
    console.error('❌ Error initializing email settings cache:', error);
    cacheInitialized = true;
  }
}

/**
 * Get email setting value by key
 * Returns default value if key doesn't exist
 */
export async function getEmailSetting(key: string, defaultValue: string = ''): Promise<string> {
  await initializeCache();
  
  // Check cache first
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  // If not in cache and Supabase is available, try to fetch from DB
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('email_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (!error && data) {
        cache.set(key, data.value);
        return data.value;
      }
    } catch (error) {
      // Ignore errors, return default
    }
  }

  return defaultValue;
}

/**
 * Set email setting value
 * Updates database and cache
 */
export async function setEmailSetting(key: string, value: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error('❌ Cannot set email setting: Supabase not configured');
    return false;
  }

  try {
    const { error } = await supabaseAdmin
      .from('email_settings')
      .upsert({
        key: key,
        value: value,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      });

    if (error) {
      console.error(`❌ Failed to set email setting ${key}:`, error);
      return false;
    }

    // Update cache
    cache.set(key, value);
    return true;
  } catch (error) {
    console.error(`❌ Error setting email setting ${key}:`, error);
    return false;
  }
}

/**
 * Get all email settings as key-value pairs
 */
export async function getAllEmailSettings(): Promise<Record<string, string>> {
  await initializeCache();

  // If cache is initialized and has data, return from cache
  if (cache.size > 0) {
    const result: Record<string, string> = {};
    for (const [key, value] of cache.entries()) {
      result[key] = value;
    }
    return result;
  }

  // Otherwise fetch from database
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('email_settings')
        .select('key, value');

      if (!error && data) {
        const result: Record<string, string> = {};
        for (const setting of data) {
          result[setting.key] = setting.value;
          cache.set(setting.key, setting.value);
        }
        return result;
      }
    } catch (error) {
      console.error('❌ Error fetching all email settings:', error);
    }
  }

  return {};
}

