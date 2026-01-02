import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

// CRITICAL: JWT_SECRET must be set in production - no default allowed
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret === 'your-secret-key-change-in-production') {
      throw new Error('JWT_SECRET must be set to a secure random string in production. Do not use the default value.');
    }
    return secret;
  }
  
  // Development: allow default but warn
  if (!secret || secret === 'your-secret-key-change-in-production') {
    console.warn('⚠️  JWT_SECRET is using default value. Change it before deploying to production.');
  }
  
  return secret || 'your-secret-key-change-in-production';
}

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function setAuthToken(token: string) {
  // This will be handled in API routes using NextResponse
}

