import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabase';

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

export interface AdminTokenPayload {
  adminId: string;
  email: string;
  role: 'viewer' | 'operator' | 'super_admin';
}

export interface AdminUser {
  id: string;
  email: string;
  password: string; // hashed
  role: 'viewer' | 'operator' | 'super_admin';
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  lastLogin: string | null;
  createdAt: string;
}

function checkSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.');
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
  } catch {
    return null;
  }
}

export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  checkSupabase();
  
  const { data, error } = await supabaseAdmin!
    .from('admin_users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error || !data) return null;
  
  return {
    id: data.id,
    email: data.email,
    password: data.password,
    role: data.role,
    twoFactorEnabled: data.two_factor_enabled,
    twoFactorSecret: data.two_factor_secret,
    lastLogin: data.last_login,
    createdAt: data.created_at,
  };
}

export async function getAdminById(id: string): Promise<AdminUser | null> {
  checkSupabase();
  
  const { data, error } = await supabaseAdmin!
    .from('admin_users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  
  return {
    id: data.id,
    email: data.email,
    password: data.password,
    role: data.role,
    twoFactorEnabled: data.two_factor_enabled,
    twoFactorSecret: data.two_factor_secret,
    lastLogin: data.last_login,
    createdAt: data.created_at,
  };
}

export async function updateAdminLastLogin(adminId: string): Promise<void> {
  checkSupabase();
  
  await supabaseAdmin!
    .from('admin_users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', adminId);
}

export async function getAdminUser(): Promise<AdminTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-token')?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function verifyAdminAuth(request: NextRequest): Promise<AdminTokenPayload & { id: string } | null> {
  const token = request.cookies.get('admin-token')?.value;
  if (!token) return null;
  
  const payload = verifyAdminToken(token);
  if (!payload) return null;
  
  return {
    ...payload,
    id: payload.adminId,
  };
}

