import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { getAllEmailSettings, getEmailSetting, setEmailSetting } from '@/lib/email-settings';

/**
 * GET /api/admin/settings/email
 * Get all email settings
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminRole('viewer');

    const settings = await getAllEmailSettings();

    return NextResponse.json({
      success: true,
      settings: settings,
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    console.error('Get email settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/settings/email
 * Update email setting
 * Body: { key: string, value: string }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdminRole('operator'); // Require operator role to change settings

    const { key, value } = await request.json();

    if (!key || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'key and value are required' },
        { status: 400 }
      );
    }

    // Validate key is allowed
    const allowedKeys = [
      'sender_email',
      'sender_name',
      'order_notifications_enabled',
      'verification_enabled',
    ];

    if (!allowedKeys.includes(key)) {
      return NextResponse.json(
        { success: false, error: `Invalid setting key: ${key}` },
        { status: 400 }
      );
    }

    // Validate boolean values for toggle settings
    if (key === 'order_notifications_enabled' || key === 'verification_enabled') {
      if (value !== 'true' && value !== 'false') {
        return NextResponse.json(
          { success: false, error: `${key} must be "true" or "false"` },
          { status: 400 }
        );
      }
    }

    const success = await setEmailSetting(key, String(value));

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update setting' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Setting updated successfully',
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    console.error('Update email settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

