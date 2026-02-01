import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, updateUser } from '@/lib/db';
import { enqueueVerificationEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      });
    }

    // If already verified, no need to resend
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Your email is already verified. You can sign in now.',
      });
    }

    // Generate new single-use, expiring verification token (same window as signup)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
    const verificationTokenExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    await updateUser(user.id, {
      verificationToken,
      verificationTokenExpiresAt,
    });

    // Queue verification email (cron sends it; do not block response)
    const queued = await enqueueVerificationEmail(user.email, verificationToken, request);
    if (!queued) {
      console.error('Failed to queue verification email for', user.email);
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

