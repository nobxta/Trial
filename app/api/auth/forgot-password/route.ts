import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, updateUser } from '@/lib/db';
import { hashResetToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

/** How long an emailed reset link stays valid. */
const RESET_TOKEN_EXPIRY_MINUTES = 60;

/** Minimum gap between reset emails for the same account, to prevent inbox flooding. */
const RESET_COOLDOWN_SECONDS = 60;

/**
 * Identical response for every outcome — unknown email, cooldown, or a mail that was
 * actually sent. Revealing the difference would turn this endpoint into an account
 * enumeration oracle.
 */
const GENERIC_RESPONSE = {
  success: true,
  message: 'If an account exists with this email, a password reset link has been sent.',
};

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email.toLowerCase().trim());

    // Unknown address: respond as if we sent the mail.
    if (!user) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    // Per-account cooldown. Still returns the generic response so the caller cannot
    // tell a rate-limited account apart from an address that does not exist.
    if (user.resetRequestedAt) {
      const elapsedMs = Date.now() - new Date(user.resetRequestedAt).getTime();
      if (elapsedMs >= 0 && elapsedMs < RESET_COOLDOWN_SECONDS * 1000) {
        return NextResponse.json(GENERIC_RESPONSE);
      }
    }

    // Only the hash is stored; the raw token exists solely in the user's inbox.
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = hashResetToken(resetToken);
    const resetTokenExpiresAt = new Date(
      Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    await updateUser(user.id, {
      resetTokenHash,
      resetTokenExpiresAt,
      resetRequestedAt: new Date().toISOString(),
    });

    try {
      await sendPasswordResetEmail(user.email, resetToken, request);
    } catch (e) {
      // Clear the token so a failed send does not leave a live reset window behind,
      // and drop the cooldown so the user can retry immediately.
      await updateUser(user.id, {
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        resetRequestedAt: null,
      });
      console.error('Failed to send password reset email:', e);
      return NextResponse.json(
        {
          success: false,
          error: 'EMAIL_SEND_FAILED',
          message:
            "We couldn't send the reset email. Please try again in a few minutes or contact support.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
