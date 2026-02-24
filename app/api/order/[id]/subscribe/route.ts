import { NextRequest, NextResponse } from 'next/server';
import { getOrderByOrderId, updateOrderNotificationEmail } from '@/lib/db-orders';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/order/[id]/subscribe
 *
 * Subscribe an email to order status notifications for this order.
 * Works for any order (guest or logged-in). Order ID is the secret.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id?.trim();
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required' },
        { status: 400 }
      );
    }

    const order = await getOrderByOrderId(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const updated = await updateOrderNotificationEmail(orderId, email);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to save notification preference' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscribed to order status notifications',
      email: updated.notificationEmail ?? email,
    });
  } catch (error) {
    console.error('Order subscribe error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
