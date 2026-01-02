import { NextRequest, NextResponse } from 'next/server';
import { getOrderByOrderId } from '@/lib/db-orders';
import { getCurrentStep } from '@/lib/status-mapping';

/**
 * GET /api/order/[id]
 * 
 * CRITICAL: Returns user-facing status from database ONLY.
 * Database is the source of truth. Provider status is NOT used to override.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get order from database (source of truth)
    const order = await getOrderByOrderId(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Return user-facing data ONLY
    // Database status is the source of truth, NOT provider status
    // CRITICAL: Use clear field names with proper semantics
    const response = {
      success: true,
      order: {
        id: order.id,
        orderId: order.orderId,
        paymentId: order.paymentId,
        // User-facing status (from database)
        status: order.userStatus, // User-friendly status
        internalStatus: order.internalStatus, // Internal status for expiration check
        currentStep: getCurrentStep(order.internalStatus), // Progress step from backend
        // CRITICAL: Clear field names with proper semantics
        // Crypto amounts (what user sends/receives)
        payAmount: order.fromAmount, // Crypto amount user sends
        payCurrency: order.fromCurrency, // Crypto currency user sends
        payNetwork: order.fromNetwork,
        payAddress: order.fromAddress,
        outcomeAmount: order.toAmount, // Crypto amount user receives
        outcomeCurrency: order.toCurrency, // Crypto currency user receives
        outcomeNetwork: order.toNetwork,
        outcomeAddress: order.toAddress,
        // Legacy fields for backward compatibility (but clearly named)
        fromCurrency: order.fromCurrency,
        fromAmount: order.fromAmount,
        fromNetwork: order.fromNetwork,
        fromAddress: order.fromAddress,
        toCurrency: order.toCurrency,
        toAmount: order.toAmount,
        toNetwork: order.toNetwork,
        toAddress: order.toAddress,
        // Timestamps
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        expiresAt: order.expiresAt || null, // Expiration timestamp
        // Transaction hashes (only if available)
        payinHash: order.payinHash || null,
        payoutHash: order.payoutHash || null,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

