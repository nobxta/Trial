import { supabaseAdmin } from './supabase';
import { wrapDbError, isNotFoundError } from './db-errors';

export interface User {
  id: string;
  email: string;
  password: string; // hashed
  emailVerified: boolean;
  verificationToken: string | null;
  /** When the verification token expires (ISO string). Null if no token or legacy. */
  verificationTokenExpiresAt: string | null;
  createdAt: string;
}

// Helper to check if Supabase is configured
function checkSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.');
  }
}

// Find user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  checkSupabase();
  
  const { data, error } = await supabaseAdmin!
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error) {
    if (isNotFoundError(error.code)) return null;
    throw wrapDbError(error, 'getUserByEmail');
  }
  if (!data) return null;
  return mapUserRow(data);
}

// Find user by ID
export async function getUserById(id: string): Promise<User | null> {
  checkSupabase();
  
  const { data, error } = await supabaseAdmin!
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (isNotFoundError(error.code)) return null;
    throw wrapDbError(error, 'getUserById');
  }
  if (!data) return null;
  return mapUserRow(data);
}

function mapUserRow(data: any): User {
  return {
    id: data.id,
    email: data.email,
    password: data.password,
    emailVerified: data.email_verified,
    verificationToken: data.verification_token,
    verificationTokenExpiresAt: data.verification_token_expires_at ?? null,
    createdAt: data.created_at,
  };
}

// Find user by verification token
export async function getUserByVerificationToken(token: string): Promise<User | null> {
  checkSupabase();
  
  const { data, error } = await supabaseAdmin!
    .from('users')
    .select('*')
    .eq('verification_token', token)
    .single();

  if (error) {
    if (isNotFoundError(error.code)) return null;
    throw wrapDbError(error, 'getUserByVerificationToken');
  }
  if (!data) return null;
  return mapUserRow(data);
}

// Create new user
export async function createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  checkSupabase();
  
  const { data, error } = await supabaseAdmin!
    .from('users')
    .insert({
      email: user.email.toLowerCase().trim(),
      password: user.password,
      email_verified: user.emailVerified,
      verification_token: user.verificationToken,
      verification_token_expires_at: user.verificationTokenExpiresAt ?? null,
    })
    .select()
    .single();

  if (error) {
    throw wrapDbError(error, 'createUser');
  }

  return mapUserRow(data);
}

// Update user
export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  checkSupabase();
  
  const updateData: any = {};
  
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.password !== undefined) updateData.password = updates.password;
  if (updates.emailVerified !== undefined) updateData.email_verified = updates.emailVerified;
  if (updates.verificationToken !== undefined) updateData.verification_token = updates.verificationToken;
  if (updates.verificationTokenExpiresAt !== undefined) updateData.verification_token_expires_at = updates.verificationTokenExpiresAt;

  const { data, error } = await supabaseAdmin!
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (isNotFoundError(error.code)) return null;
    throw wrapDbError(error, 'updateUser');
  }
  if (!data) return null;

  return mapUserRow(data);
}

// Update user preferences
export async function updateUserPreferences(
  userId: string,
  preferences: { notificationsEnabled?: boolean }
): Promise<boolean> {
  checkSupabase();

  const updateData: any = {};
  if (preferences.notificationsEnabled !== undefined) {
    updateData.notifications_enabled = preferences.notificationsEnabled;
  }

  const { error } = await supabaseAdmin!
    .from('users')
    .update(updateData)
    .eq('id', userId);

  if (error) throw wrapDbError(error, 'updateUserPreferences');
  return true;
}

// Change user password
export async function changeUserPassword(
  userId: string,
  newPassword: string
): Promise<boolean> {
  checkSupabase();

  const { hashPassword } = await import('./auth');
  const hashedPassword = await hashPassword(newPassword);

  const { error } = await supabaseAdmin!
    .from('users')
    .update({ password: hashedPassword })
    .eq('id', userId);

  if (error) throw wrapDbError(error, 'changeUserPassword');
  return true;
}

// Get user with preferences
export async function getUserWithPreferences(userId: string): Promise<{
  id: string;
  email: string;
  emailVerified: boolean;
  notificationsEnabled: boolean;
  createdAt: string;
} | null> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('users')
    .select('id, email, email_verified, notifications_enabled, created_at')
    .eq('id', userId)
    .single();

  if (error) {
    if (isNotFoundError(error.code)) return null;
    throw wrapDbError(error, 'getUserWithPreferences');
  }
  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    emailVerified: data.email_verified,
    notificationsEnabled: data.notifications_enabled || false,
    createdAt: data.created_at,
  };
}
