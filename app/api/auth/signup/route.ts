import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { enqueueVerificationEmail } from '@/lib/email';
import { cleanupUnverifiedAccounts } from '@/lib/cleanup';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Create user with single-use, expiring verification token (e.g. 24h)
    const hashedPassword = await hashPassword(password);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
    const verificationTokenExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    const user = await createUser({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      emailVerified: false,
      verificationToken,
      verificationTokenExpiresAt,
    });

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    // Get base URL for verification link
    const protocol = request.headers.get('x-forwarded-proto') || 
                     (request.url.startsWith('https') ? 'https' : 'http');
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

    // Queue verification email (non-blocking; cron sends it)
    const queued = await enqueueVerificationEmail(user.email, verificationToken, request);
    if (!queued) {
      console.error('Failed to queue verification email for', user.email);
    }

    // Cleanup unverified accounts older than 1 hour (non-blocking)
    cleanupUnverifiedAccounts().catch(() => {
      // Ignore cleanup errors - it's not critical
    });

    const response = NextResponse.json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      },
      // Include verification URL in development for easier testing
      ...(process.env.NODE_ENV === 'development' && { verificationUrl }),
    });

    // Set auth cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

