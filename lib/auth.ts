import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getJwtSecret } from './env';
import { supabaseAdmin } from './supabase';

const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  /** Issued-at (seconds), set by jsonwebtoken. Used to detect sessions predating a password change. */
  iat?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Hash a password reset token for storage.
 *
 * The raw token only ever exists in the user's email. We store the SHA-256 hash so a
 * database leak cannot be turned into account takeover. SHA-256 (not bcrypt) is correct
 * here: the token is 256 bits of entropy, so it is not brute-forceable, and lookup must
 * be an indexed equality match.
 */
export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * True if the session predates the account's last password change.
 *
 * Our JWTs are stateless, so a password change cannot revoke them directly. Instead we
 * compare the token's `iat` against `password_changed_at`: anything issued earlier is
 * refused, which signs out every other device after a reset or password change.
 * Fails open on database errors so an outage cannot lock everyone out.
 */
async function isSessionStale(payload: TokenPayload): Promise<boolean> {
  if (!payload.iat || !supabaseAdmin) return false;

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('password_changed_at')
      .eq('id', payload.userId)
      .single();

    if (error || !data?.password_changed_at) return false;

    const changedAt = new Date(data.password_changed_at).getTime();
    if (Number.isNaN(changedAt)) return false;

    // `iat` has one-second resolution and password_changed_at is floored to the second,
    // so a token minted in the same second as the change is still valid.
    return payload.iat * 1000 < changedAt;
  } catch {
    return false;
  }
}

export function generateToken(payload: TokenPayload): string {
  const secret = getJwtSecret();
  // Sign only our own claims: passing through an existing `iat` would let a re-issued
  // token inherit the old issue time and immediately read as stale.
  const { userId, email } = payload;
  return jwt.sign({ userId, email }, secret, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const secret = getJwtSecret();
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;
  if (await isSessionStale(payload)) return null;

  return payload;
}

export function setAuthToken(token: string) {
  // This will be handled in API routes using NextResponse
}

