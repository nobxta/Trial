import { NextRequest, NextResponse } from 'next/server';
import { getUserByResetTokenHash, updateUser } from '@/lib/db';
import { hashResetToken, hashPassword, generateToken } from '@/lib/auth';
import { logUserLogin } from '@/lib/user-login-tracker';

const INVALID_TOKEN_MESSAGE =
  'This reset link is invalid or has already been used. Please request a new one.';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'INVALID_TOKEN', message: INVALID_TOKEN_MESSAGE },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const user = await getUserByResetTokenHash(hashResetToken(token));
    if (!user || !user.resetTokenHash) {
      return NextResponse.json(
        { success: false, error: 'INVALID_TOKEN', message: INVALID_TOKEN_MESSAGE },
        { status: 400 }
      );
    }

    // Expired links are rejected and cleared so the row does not keep a dead token.
    if (
      !user.resetTokenExpiresAt ||
      Date.now() > new Date(user.resetTokenExpiresAt).getTime()
    ) {
      await updateUser(user.id, { resetTokenHash: null, resetTokenExpiresAt: null });
      return NextResponse.json(
        {
          success: false,
          error: 'TOKEN_EXPIRED',
          message: 'This reset link has expired. Please request a new one.',
        },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    // Floored to the second: `iat` has one-second resolution, so this keeps the token we
    // are about to mint below from being read as predating the change.
    const passwordChangedAt = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();

    await updateUser(user.id, {
      password: hashedPassword,
      // Single-use: clear the token so the same link cannot be replayed.
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      resetRequestedAt: null,
      // Signs out every other device (see isSessionStale in lib/auth.ts).
      passwordChangedAt,
      // Receiving the emailed link proves ownership of the address, so an unverified
      // account becomes verified here. Without this, a user who never clicked their
      // signup link would reset successfully and still be blocked at sign-in.
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    });

    await logUserLogin(user.id, request, true);

    const authToken = generateToken({ userId: user.id, email: user.email });

    const response = NextResponse.json({
      success: true,
      message: 'Password updated. You are now signed in.',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: true,
      },
    });

    // Sign the user straight in — same cookie the signin route issues.
    response.cookies.set('auth-token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
