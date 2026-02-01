import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { supabaseAdmin } from '@/lib/supabase';
import { getPaymentStatus } from '@/lib/nowpayments';
import { updateOrderStatus } from '@/lib/db-orders';
import { requireNotMaintenanceMode } from '@/lib/maintenance-mode';
import { getPayoutMode } from '@/lib/payout-mode';
import { mapProviderStatusToInternal, type InternalStatus } from '@/lib/status-mapping';
import { notifyOrderStatus } from '@/lib/notifications';
import { recordOrderCompletion } from '@/lib/ledger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdminRole('operator');

    const { action, reason, payoutHash } = await request.json();

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Get current order state for logging and guards
    const { data: currentOrder } = await supabaseAdmin!
      .from('orders')
      .select('*')
      .eq('order_id', params.id)
      .single();

    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const currentInternalStatus = (currentOrder.internal_status || currentOrder.status) as InternalStatus;
    // Funds-release exception: mark_completed and unlock must be allowed even during maintenance and when locked (operator)
    // so payment-confirmed orders can always reach DONE and funds are never permanently locked.
    const PAID_NOT_DONE_STATUSES: InternalStatus[] = ['PAYMENT_CONFIRMED', 'MANUAL_REVIEW', 'PROCESSING_BY_PROVIDER'];
    const isFundsReleaseAction =
      (action === 'mark_completed' || action === 'unlock') &&
      PAID_NOT_DONE_STATUSES.includes(currentInternalStatus);

    if (!isFundsReleaseAction) {
      await requireNotMaintenanceMode();
    }

    // Rule 1: Locked orders cannot be modified (except Super Admin, or operator doing funds-release for paid-but-not-done)
    if (currentOrder.locked && admin.role !== 'super_admin' && !isFundsReleaseAction) {
      return NextResponse.json(
        { error: 'Order is locked and cannot be modified' },
        { status: 403 }
      );
    }

    // Rule 2: DONE orders cannot be marked FAILED
    if (action === 'mark_failed' && (currentInternalStatus === 'DONE' || currentOrder.status === 'DONE')) {
      return NextResponse.json(
        { error: 'DONE orders cannot be marked as failed' },
        { status: 400 }
      );
    }

    // Rule 3: EXPIRED orders cannot be re-opened (except unlock)
    if (action === 'resync' && (currentInternalStatus === 'EXPIRED' || currentOrder.status === 'EXPIRED')) {
      return NextResponse.json(
        { error: 'EXPIRED orders cannot be resynced' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'lock': {
        const previousState = {
          locked: currentOrder.locked,
          status: currentOrder.status,
        };

        const { data: updatedOrder, error } = await supabaseAdmin!
          .from('orders')
          .update({ locked: true })
          .eq('order_id', params.id)
          .select()
          .single();

        if (error) throw error;

        await logAdminAction(admin.adminId, 'lock_order', 'order', {
          resourceId: params.id,
          previousState,
          newState: { locked: updatedOrder.locked, status: updatedOrder.status },
          details: { reason },
          ipAddress,
          userAgent,
        });

        return NextResponse.json({ success: true, message: 'Order locked' });
      }

      case 'unlock': {
        const previousState = {
          locked: currentOrder.locked,
          status: currentOrder.status,
        };

        const { data: updatedOrder, error } = await supabaseAdmin!
          .from('orders')
          .update({ locked: false })
          .eq('order_id', params.id)
          .select()
          .single();

        if (error) throw error;

        await logAdminAction(admin.adminId, 'unlock_order', 'order', {
          resourceId: params.id,
          previousState,
          newState: { locked: updatedOrder.locked, status: updatedOrder.status },
          ipAddress,
          userAgent,
        });

        return NextResponse.json({ success: true, message: 'Order unlocked' });
      }

      case 'verify_payment': {
        // Read-only verification: Check provider status, show comparison, don't change DB
        if (!currentOrder.payment_id) {
          return NextResponse.json(
            { error: 'Order has no payment ID' },
            { status: 400 }
          );
        }
        // Always use order's payment_mode so we hit the correct API (live vs sandbox)
        if (currentOrder.payment_mode == null || currentOrder.payment_mode === '') {
          return NextResponse.json(
            { error: 'Order has no payment_mode set; cannot verify (fix order data or use resync)' },
            { status: 400 }
          );
        }

        try {
          const paymentStatus = await getPaymentStatus(currentOrder.payment_id, currentOrder.payment_mode);
          const providerInternalStatus = mapProviderStatusToInternal(paymentStatus.payment_status);
          
          // Log the verification (read-only action)
          await logAdminAction(admin.adminId, 'verify_payment', 'order', {
            resourceId: params.id,
            previousState: {
              internal_status: currentOrder.internal_status || currentOrder.status,
              provider_status: currentOrder.provider_status,
            },
            newState: {
              internal_status: currentOrder.internal_status || currentOrder.status,
              provider_status: paymentStatus.payment_status,
            },
            details: {
              payment_id: currentOrder.payment_id,
              provider_status: paymentStatus.payment_status,
              provider_mapped_status: providerInternalStatus,
              db_internal_status: currentOrder.internal_status || currentOrder.status,
              status_match: (currentOrder.internal_status || currentOrder.status) === providerInternalStatus,
            },
            ipAddress,
            userAgent,
          });

          return NextResponse.json({
            success: true,
            message: 'Payment verified (read-only)',
            comparison: {
              db_internal_status: currentOrder.internal_status || currentOrder.status,
              db_provider_status: currentOrder.provider_status,
              provider_status: paymentStatus.payment_status,
              provider_mapped_internal: providerInternalStatus,
              status_match: (currentOrder.internal_status || currentOrder.status) === providerInternalStatus,
            },
            provider_data: paymentStatus,
          });
        } catch (error: any) {
          return NextResponse.json(
            { error: `Failed to verify payment: ${error.message}` },
            { status: 500 }
          );
        }
      }

      case 'resync': {
        if (!currentOrder.payment_id) {
          return NextResponse.json(
            { error: 'Order has no payment ID' },
            { status: 400 }
          );
        }

        const previousState = {
          internal_status: currentOrder.internal_status || currentOrder.status,
          provider_status: currentOrder.provider_status,
          payment_id: currentOrder.payment_id,
        };

        // Use order's payment_mode; if null (legacy), dual-probe sandbox then live
        let paymentStatus: { payment_status?: string };
        const resyncMode = currentOrder.payment_mode && currentOrder.payment_mode !== '' ? currentOrder.payment_mode : undefined;
        if (resyncMode) {
          paymentStatus = await getPaymentStatus(currentOrder.payment_id, resyncMode);
        } else {
          try {
            paymentStatus = await getPaymentStatus(currentOrder.payment_id, 'sandbox');
          } catch {
            paymentStatus = await getPaymentStatus(currentOrder.payment_id, 'live');
          }
        }
        const mappedStatus = mapProviderStatusToInternal(paymentStatus.payment_status) as InternalStatus;
        
        // CRITICAL: In manual payout mode, prevent automatic DONE status during resync
        const payoutMode = await getPayoutMode();
        let finalStatus = mappedStatus;
        if (payoutMode === 'manual' && (mappedStatus === 'DONE' || paymentStatus.payment_status?.toLowerCase() === 'finished' || paymentStatus.payment_status?.toLowerCase() === 'success')) {
          // In manual mode, keep at PAYMENT_CONFIRMED or MANUAL_REVIEW
          if (currentInternalStatus === 'MANUAL_REVIEW') {
            finalStatus = 'MANUAL_REVIEW';
          } else {
            finalStatus = 'PAYMENT_CONFIRMED';
          }
        }
        
        const updatedOrder = await updateOrderStatus(params.id, finalStatus, {
          providerStatus: paymentStatus.payment_status,
        }, {
          source: 'admin',
          updatedBy: admin.adminId,
        });

        if (!updatedOrder) {
          return NextResponse.json(
            { error: 'Failed to update order status' },
            { status: 500 }
          );
        }

        await logAdminAction(admin.adminId, 'resync_order', 'order', {
          resourceId: params.id,
          previousState,
          newState: { 
            internal_status: updatedOrder.internalStatus,
            provider_status: paymentStatus.payment_status,
            payment_id: currentOrder.payment_id,
          },
          details: { 
            payment_id: currentOrder.payment_id,
            payment_status: paymentStatus.payment_status,
            mapped_status: finalStatus,
          },
          ipAddress,
          userAgent,
        });

        return NextResponse.json({ 
          success: true, 
          message: 'Order status resynced',
          paymentStatus: paymentStatus.payment_status,
          orderStatus: finalStatus,
        });
      }

      case 'mark_failed': {
        // Validate: Cannot mark DONE orders as failed
        if (currentInternalStatus === 'DONE') {
          return NextResponse.json(
            { error: 'DONE orders cannot be marked as failed' },
            { status: 400 }
          );
        }

        const previousState = {
          internal_status: currentOrder.internal_status || currentOrder.status,
        };

        const updatedOrder = await updateOrderStatus(params.id, 'FAILED', undefined, {
          source: 'admin',
          updatedBy: admin.adminId,
        });

        if (!updatedOrder) {
          return NextResponse.json(
            { error: 'Failed to update order status' },
            { status: 500 }
          );
        }

        // Check if status actually changed (invalid transitions return current order)
        const statusChanged = (currentOrder.internal_status || currentOrder.status) !== updatedOrder.internalStatus;
        
        if (!statusChanged) {
          console.error(`🚫 Invalid status transition blocked: Order ${params.id} cannot transition to FAILED from ${currentOrder.internal_status || currentOrder.status} (source: admin)`);
          return NextResponse.json(
            { error: `Cannot transition order from ${currentOrder.internal_status || currentOrder.status} to FAILED` },
            { status: 400 }
          );
        }

        await logAdminAction(admin.adminId, 'mark_order_failed', 'order', {
          resourceId: params.id,
          previousState,
          newState: { internal_status: updatedOrder.internalStatus },
          details: { reason: reason || 'Marked as failed by admin' },
          ipAddress,
          userAgent,
        });

        // Send notification to user (non-blocking, don't fail if notification fails)
        notifyOrderStatus(currentOrder.user_id, params.id, updatedOrder.internalStatus, request).catch((err) => {
          console.error('Failed to send order status notification:', err);
        });

        return NextResponse.json({ success: true, message: 'Order marked as failed' });
      }

      case 'approve_manual_payout': {
        // Move order to MANUAL_REVIEW or approve for manual payout
        // Only allow for orders with confirmed payment
        const allowedStatuses: InternalStatus[] = ['PAYMENT_CONFIRMED', 'CONFIRMING', 'MANUAL_REVIEW'];
        if (!allowedStatuses.includes(currentInternalStatus)) {
          return NextResponse.json(
            { error: `Cannot approve manual payout from ${currentInternalStatus} status. Order must have confirmed payment.` },
            { status: 400 }
          );
        }

        const previousState = {
          internal_status: currentOrder.internal_status || currentOrder.status,
          manual_review_required: currentOrder.manual_review_required,
        };

        const { data: updatedOrder, error: updateError } = await supabaseAdmin!
          .from('orders')
          .update({
            internal_status: 'MANUAL_REVIEW',
            manual_review_required: true,
            manual_review_assigned_to: admin.adminId,
            manual_review_reason: reason || 'Approved for manual payout',
          })
          .eq('order_id', params.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Also update via updateOrderStatus to ensure user_status is calculated
        await updateOrderStatus(params.id, 'MANUAL_REVIEW', undefined, {
          source: 'admin',
          updatedBy: admin.adminId,
        });

        await logAdminAction(admin.adminId, 'approve_manual_payout', 'order', {
          resourceId: params.id,
          previousState,
          newState: { 
            internal_status: 'MANUAL_REVIEW',
            manual_review_required: true,
          },
          details: { 
            reason: reason || 'Approved for manual payout',
            assigned_to: admin.adminId,
          },
          ipAddress,
          userAgent,
        });

        return NextResponse.json({ success: true, message: 'Order approved for manual payout' });
      }

      case 'enter_payout_hash': {
        // Enter payout transaction hash for manual mode
        if (!payoutHash || !payoutHash.trim()) {
          return NextResponse.json(
            { error: 'Payout hash is required' },
            { status: 400 }
          );
        }

        // Validate hash format (basic check - alphanumeric, 32+ chars)
        if (payoutHash.length < 32 || !/^[a-zA-Z0-9]+$/.test(payoutHash)) {
          return NextResponse.json(
            { error: 'Invalid payout hash format' },
            { status: 400 }
          );
        }

        const previousState = {
          payout_hash: currentOrder.payout_hash,
        };

        const { data: updatedOrder, error: updateError } = await supabaseAdmin!
          .from('orders')
          .update({
            payout_hash: payoutHash.trim(),
            payout_hash_entered_by: admin.adminId,
            payout_hash_entered_at: new Date().toISOString(),
          })
          .eq('order_id', params.id)
          .select()
          .single();

        if (updateError) throw updateError;

        await logAdminAction(admin.adminId, 'enter_payout_hash', 'order', {
          resourceId: params.id,
          previousState,
          newState: { payout_hash: payoutHash.trim() },
          details: { 
            payout_hash: payoutHash.trim(),
            reason: reason || 'Payout hash entered by admin',
          },
          ipAddress,
          userAgent,
        });

        return NextResponse.json({ success: true, message: 'Payout hash recorded' });
      }

      case 'mark_completed': {
        // Manual completion: Admin confirms payout was sent manually
        // Only allow for orders in PAYMENT_CONFIRMED, MANUAL_REVIEW, or PROCESSING_BY_PROVIDER
        const allowedStatuses: InternalStatus[] = ['PAYMENT_CONFIRMED', 'MANUAL_REVIEW', 'PROCESSING_BY_PROVIDER', 'CONFIRMING'];
        if (!allowedStatuses.includes(currentInternalStatus)) {
          return NextResponse.json(
            { error: `Cannot mark order as completed from ${currentInternalStatus} status. Order must have confirmed payment.` },
            { status: 400 }
          );
        }

        const previousState = {
          internal_status: currentOrder.internal_status || currentOrder.status,
        };

        const updatedOrder = await updateOrderStatus(params.id, 'DONE', undefined, {
          source: 'admin',
          updatedBy: admin.adminId,
        });

        if (!updatedOrder) {
          return NextResponse.json(
            { error: 'Failed to update order status' },
            { status: 500 }
          );
        }

        // Check if status actually changed (invalid transitions return current order)
        const statusChanged = (currentOrder.internal_status || currentOrder.status) !== updatedOrder.internalStatus;
        
        if (!statusChanged) {
          console.error(`🚫 Invalid status transition blocked: Order ${params.id} cannot transition to DONE from ${currentOrder.internal_status || currentOrder.status} (source: admin)`);
          return NextResponse.json(
            { error: `Cannot transition order from ${currentOrder.internal_status || currentOrder.status} to DONE` },
            { status: 400 }
          );
        }

        await logAdminAction(admin.adminId, 'mark_order_completed', 'order', {
          resourceId: params.id,
          previousState,
          newState: { internal_status: updatedOrder.internalStatus },
          details: { 
            reason: reason || 'Manually completed by admin',
            payout_mode: 'manual',
            payout_hash: currentOrder.payout_hash || null,
          },
          ipAddress,
          userAgent,
        });

        // Record order completion in ledger (idempotent, non-blocking)
        recordOrderCompletion(
          updatedOrder.orderId,
          updatedOrder.userId,
          updatedOrder.toAmount,
          updatedOrder.toCurrency,
          updatedOrder.fromAmount,
          updatedOrder.fromCurrency,
          0.01 // 1% platform fee (TODO: make configurable)
        ).catch((err) => {
          console.error('Failed to record order completion in ledger:', err);
          // Don't fail the request if ledger recording fails
        });

        // Send notification to user (non-blocking, don't fail if notification fails)
        notifyOrderStatus(currentOrder.user_id, params.id, updatedOrder.internalStatus, request).catch((err) => {
          console.error('Failed to send order status notification:', err);
        });

        return NextResponse.json({ success: true, message: 'Order marked as completed' });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Order action error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

