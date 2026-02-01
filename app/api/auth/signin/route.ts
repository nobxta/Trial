import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { getAdminByEmail, generateAdminToken, updateAdminLastLogin, verifyPassword as verifyAdminPassword } from '@/lib/admin-auth';
import { verifyPassword, generateToken } from '@/lib/auth';
import { logUserLogin } from '@/lib/user-login-tracker';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // First check if it's an admin user
    const admin = await getAdminByEmail(email);
    if (admin) {
      // Verify admin password
      const isValid = await verifyAdminPassword(password, admin.password);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Generate admin token
      const adminToken = generateAdminToken({
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
      });

      // Update last login
      await updateAdminLastLogin(admin.id);

      const response = NextResponse.json({
        success: true,
        isAdmin: true,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
      });

      // Set admin cookie
      response.cookies.set('admin-token', adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    // If not admin, check regular user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      // Log failed login attempt
      await logUserLogin(user.id, request, false, 'Invalid password');
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      // Log failed login attempt
      await logUserLogin(user.id, request, false, 'Email not verified');
      return NextResponse.json(
        { 
          success: false, 
          error: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email address before signing in. Check your inbox for the verification link.',
          email: user.email
        },
        { status: 403 }
      );
    }

    // Log successful login
    await logUserLogin(user.id, request, true);

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    const response = NextResponse.json({
      success: true,
      isAdmin: false,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      },
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
    console.error('Signin error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

