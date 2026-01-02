import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { getAllBlockedIPs, blockIP, unblockIP, getClientIP } from '@/lib/ip-blocking';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminRole('viewer');

    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const blockedIPs = await getAllBlockedIPs(includeInactive);

    return NextResponse.json({
      success: true,
      blocked_ips: blockedIPs,
      total: blockedIPs.length,
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Get blocked IPs error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRole('operator'); // Operators and above can block IPs

    const body = await request.json();
    const { ip_address, reason, expires_at, metadata } = body;

    if (!ip_address || !reason) {
      return NextResponse.json(
        { error: 'IP address and reason are required' },
        { status: 400 }
      );
    }

    const expiresAt = expires_at ? new Date(expires_at) : undefined;

    const blockedIP = await blockIP(
      ip_address,
      reason,
      admin.adminId,
      expiresAt,
      metadata
    );

    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'block_ip', 'security', {
      resourceId: ip_address,
      details: { reason, expires_at: expiresAt?.toISOString() || null },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      blocked_ip: blockedIP,
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Block IP error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdminRole('operator'); // Operators and above can unblock IPs

    const searchParams = request.nextUrl.searchParams;
    const ip_address = searchParams.get('ip_address');

    if (!ip_address) {
      return NextResponse.json(
        { error: 'IP address is required' },
        { status: 400 }
      );
    }

    const success = await unblockIP(ip_address);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to unblock IP' },
        { status: 500 }
      );
    }

    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'unblock_ip', 'security', {
      resourceId: ip_address,
      details: {},
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: 'IP unblocked successfully',
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Unblock IP error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

