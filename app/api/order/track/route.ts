import { NextRequest, NextResponse } from 'next/server';
import { getPaymentStatus } from '@/lib/nowpayments';
import { getOrderByOrderId } from '@/lib/db-orders';
import { getUserByEmail } from '@/lib/db';

interface TrackOrderRequest {
  order_id: string;
  email?: string;
  token?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TrackOrderRequest = await request.json();
    
    if (!body.order_id) {
      return NextResponse.json(
        { success: false, error: 'ORDER_ID_REQUIRED' },
        { status: 400 }
      );
    }

    const orderId = body.order_id.trim().toUpperCase();
    
    // Query database (source of truth)
    // Crypto exchanges allow tracking by orderId alone - no authentication required
    const order = await getOrderByOrderId(orderId);
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Email/token are optional - allow tracking by orderId alone
    // This is standard for crypto exchanges (privacy-focused, no registration required)
    // If email is provided, we can optionally verify it matches, but don't require it
    // This allows users to track orders without logging in

    // Fetch latest payment status from NOWPayments
    let payment = null;
    if (order.paymentId) {
      try {
        payment = await getPaymentStatus(order.paymentId);
      } catch (error) {
        console.error('Failed to fetch payment status:', error);
        // Continue with order data even if payment fetch fails
      }
    }

    // Return formatted response
    return NextResponse.json({
      success: true,
      data: {
        order_id: orderId,
        status: mapPaymentStatusToOrderStatus(payment?.payment_status || order.status),
        type: 'exchange', // Could be stored in DB later
        created_at: payment?.created_at || order.createdAt,
        expires_in: payment ? calculateExpiresIn(payment.expiration_estimate_date || payment.time_limit) : 0,
        from: {
          coin: order.fromCurrency,
          network: order.fromNetwork || 'N/A',
          amount: order.fromAmount.toString(),
          address: order.fromAddress || payment?.pay_address || 'N/A',
          confirmations: payment?.amount_received ? 1 : 0,
          required_confirmations: 1
        },
        to: {
          coin: order.toCurrency,
          network: order.toNetwork || 'N/A',
          amount: order.toAmount.toString(),
          address: order.toAddress || 'N/A'
        },
        tx: {
          deposit_tx: payment?.payin_hash || null,
          withdraw_tx: payment?.payout_hash || null
        },
        timeline: getTimelineFromStatus(payment?.payment_status || order.status)
      }
    });
  } catch (error) {
    console.error('Track order error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

// Helper functions for production use:
function mapPaymentStatusToOrderStatus(paymentStatus: string): string {
  const statusMap: Record<string, string> = {
    'waiting': 'NEW',
    'confirming': 'CONFIRMING',
    'confirmed': 'PENDING',
    'sending': 'EXCHANGE',
    'partially_paid': 'PENDING',
    'finished': 'DONE',
    'success': 'DONE',
    'failed': 'EXPIRED',
    'expired': 'EXPIRED',
    'refunded': 'EXPIRED'
  };
  return statusMap[paymentStatus] || 'NEW';
}

function calculateExpiresIn(expirationDate?: string): number {
  if (!expirationDate) return 0;
  const expires = new Date(expirationDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((expires - now) / 1000));
}

function getTimelineFromStatus(status: string): string[] {
  const timeline: string[] = ['ORDER_CREATED'];
  
  if (['confirming', 'confirmed', 'sending', 'finished', 'success'].includes(status)) {
    timeline.push('PAYMENT_RECEIVED');
  }
  
  if (['confirming', 'confirmed'].includes(status)) {
    timeline.push('CONFIRMING');
  }
  
  if (['sending', 'finished', 'success'].includes(status)) {
    timeline.push('EXCHANGE_IN_PROGRESS');
  }
  
  if (['finished', 'success'].includes(status)) {
    timeline.push('WITHDRAW_COMPLETE');
  }
  
  return timeline;
}

