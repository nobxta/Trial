import { NextRequest, NextResponse } from 'next/server';
import { getUserByVerificationToken, updateUser } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token is required' },
        { status: 400 }
      );
    }

    const user = await getUserByVerificationToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { success: true, message: 'Email already verified' },
        { status: 200 }
      );
    }

    // Verify email
    await updateUser(user.id, {
      emailVerified: true,
      verificationToken: null,
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

