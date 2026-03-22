import { NextRequest, NextResponse } from 'next/server';
import { getUserByVerificationToken, updateUser, updateUserPreferences } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification link is required. Please use the link from your email.' },
        { status: 400 }
      );
    }

    const user = await getUserByVerificationToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'This verification link is invalid. Please check the link or request a new one.' },
        { status: 400 }
      );
    }

    // Already verified: token was used or email was verified another way. Single-use: don't accept again.
    if (user.emailVerified) {
      return NextResponse.json(
        { success: true, message: 'Email is already verified. You can sign in.' },
        { status: 200 }
      );
    }

    // Reject expired tokens (user-friendly message)
    if (user.verificationTokenExpiresAt) {
      const expiresAt = new Date(user.verificationTokenExpiresAt).getTime();
      if (Date.now() > expiresAt) {
        return NextResponse.json(
          { success: false, error: 'This verification link has expired. Please request a new verification email.' },
          { status: 400 }
        );
      }
    }

    // Single-use: verify and invalidate token so it cannot be reused
    await updateUser(user.id, {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    });

    // Auto-enable order notifications for verified users
    await updateUserPreferences(user.id, { notificationsEnabled: true });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully. You can sign in.',
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again or request a new verification email.' },
      { status: 500 }
    );
  }
}

