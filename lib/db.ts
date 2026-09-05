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
  /** SHA-256 hash of the password reset token. Raw token is never stored. */
  resetTokenHash: string | null;
  /** When the reset token expires (ISO string). Null if no active reset. */
  resetTokenExpiresAt: string | null;
  /** Last reset request (ISO string), used for the per-email cooldown. */
  resetRequestedAt: string | null;
  /** Last password change (ISO string). JWTs issued before this are stale. */
  passwordChangedAt: string | null;
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
    resetTokenHash: data.reset_token_hash ?? null,
    resetTokenExpiresAt: data.reset_token_expires_at ?? null,
    resetRequestedAt: data.reset_requested_at ?? null,
    passwordChangedAt: data.password_changed_at ?? null,
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

// Find user by password reset token hash
export async function getUserByResetTokenHash(tokenHash: string): Promise<User | null> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('users')
    .select('*')
    .eq('reset_token_hash', tokenHash)
    .single();

  if (error) {
    if (isNotFoundError(error.code)) return null;
    throw wrapDbError(error, 'getUserByResetTokenHash');
  }
  if (!data) return null;
  return mapUserRow(data);
}

// Create new user
// Reset/password-change columns are never set at signup, so they are excluded here
// rather than forcing every caller to pass nulls.
export async function createUser(
  user: Omit<
    User,
    'id' | 'createdAt' | 'resetTokenHash' | 'resetTokenExpiresAt' | 'resetRequestedAt' | 'passwordChangedAt'
  >
): Promise<User> {
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
  if (updates.resetTokenHash !== undefined) updateData.reset_token_hash = updates.resetTokenHash;
  if (updates.resetTokenExpiresAt !== undefined) updateData.reset_token_expires_at = updates.resetTokenExpiresAt;
  if (updates.resetRequestedAt !== undefined) updateData.reset_requested_at = updates.resetRequestedAt;
  if (updates.passwordChangedAt !== undefined) updateData.password_changed_at = updates.passwordChangedAt;

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

  // Floor to the second so a JWT minted in the same second is not treated as stale
  // (jwt `iat` has one-second resolution).
  const passwordChangedAt = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();

  const { error } = await supabaseAdmin!
    .from('users')
    .update({ password: hashedPassword, password_changed_at: passwordChangedAt })
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
    notificationsEnabled: data.notifications_enabled ?? true,
    createdAt: data.created_at,
  };
}
