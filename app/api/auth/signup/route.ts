import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
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

    // Get base URL for verification link
    const protocol = request.headers.get('x-forwarded-proto') || 
                     (request.url.startsWith('https') ? 'https' : 'http');
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

    // Send verification email immediately via SMTP (no queue)
    let emailSent = true;
    try {
      await sendVerificationEmail(user.email, verificationToken, request);
    } catch (e) {
      console.error('Failed to send verification email:', e);
      emailSent = false;
    }

    const response = NextResponse.json({
      success: true,
      message: emailSent
        ? 'Account created. Please check your email to verify your account.'
        : 'Account created. We couldn\'t send the verification email right now. Please use "Resend verification email" on the sign-in page.',
      emailSent,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      },
      // Include verification URL in development for easier testing
      ...(process.env.NODE_ENV === 'development' && { verificationUrl }),
    });

    // Do NOT set auth cookie — user must verify email and sign in to get a session.
    // This ensures unverified users are never shown as logged in.

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

