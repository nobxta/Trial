import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmailViaSMTP } from '@/lib/email';
import type { EmailCategory } from '@/lib/email-from';
import { recordCronSuccess, recordCronFailure, alertIfCronStale, getPendingEmailCount, alertIfEmailBacklog } from '@/lib/cron-runs';

const ENDPOINT = '/api/cron/process-email-queue';

/**
 * Cron: Process email queue. Call via external scheduler (e.g. cron-job.org). See docs/EXTERNAL_CRON_SETUP.md.
 * Security: In production CRON_SECRET must exist and be non-empty; fail closed.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET missing in production');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await alertIfCronStale(ENDPOINT);

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    console.log('📧 [Email Queue] Starting email queue processing...');

    // Fetch pending emails ready to be sent (scheduled_at <= now)
    const { data: pendingEmails, error: fetchError } = await supabaseAdmin
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('❌ [Email Queue] Failed to fetch pending emails:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch pending emails' },
        { status: 500 }
      );
    }

    const pendingCount = await getPendingEmailCount();
    alertIfEmailBacklog(pendingCount);

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log('✅ [Email Queue] No pending emails to process');
      await recordCronSuccess(ENDPOINT);
      return NextResponse.json({
        success: true,
        processed: 0,
        sent: 0,
        failed: 0,
        retried: 0,
      });
    }

    console.log(`📬 [Email Queue] Processing ${pendingEmails.length} email(s)...`);

    let sentCount = 0;
    let failedCount = 0;
    let retriedCount = 0;

    // Process each email independently (errors don't stop processing)
    for (const email of pendingEmails) {
      try {
        // Attempt to send email via SMTP
        // Note: email_queue table doesn't store category, so we use GENERIC as default
        const result = await sendEmailViaSMTP({
          to: email.to_email,
          subject: email.subject,
          html: email.html,
          text: email.text || undefined,
          category: 'GENERIC' as EmailCategory,
        });

        if (result.success) {
          // Success: mark as sent
          const { error: updateError } = await supabaseAdmin
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', email.id);

          if (updateError) {
            console.error(`❌ [Email Queue] Failed to update email ${email.id} as sent:`, updateError);
          } else {
            console.log(`✅ [Email Queue] Email sent to ${email.to_email} (${email.subject})`);
            sentCount++;
          }
        } else {
          // Failure: increment attempts and handle retry
          const newAttempts = (email.attempts || 0) + 1;
          const maxAttempts = 3;

          if (newAttempts >= maxAttempts) {
            // Permanent failure: mark as failed
            const { error: updateError } = await supabaseAdmin
              .from('email_queue')
              .update({
                status: 'failed',
                attempts: newAttempts,
                last_error: result.error || 'Unknown error',
              })
              .eq('id', email.id);

            if (updateError) {
              console.error(`❌ [Email Queue] Failed to update email ${email.id} as failed:`, updateError);
            } else {
              console.error(`❌ [Email Queue] Email permanently failed after ${newAttempts} attempts: ${email.to_email} (${email.subject}) - ${result.error}`);
              failedCount++;
            }
          } else {
            // Retry: reschedule with exponential backoff
            // Attempt 1: 5 minutes, Attempt 2: 15 minutes
            const backoffMinutes = newAttempts === 1 ? 5 : 15;
            const nextScheduledAt = new Date();
            nextScheduledAt.setMinutes(nextScheduledAt.getMinutes() + backoffMinutes);

            const { error: updateError } = await supabaseAdmin
              .from('email_queue')
              .update({
                attempts: newAttempts,
                last_error: result.error || 'Unknown error',
                scheduled_at: nextScheduledAt.toISOString(),
              })
              .eq('id', email.id);

            if (updateError) {
              console.error(`❌ [Email Queue] Failed to reschedule email ${email.id}:`, updateError);
            } else {
              console.log(`🔄 [Email Queue] Email rescheduled for retry ${newAttempts}/${maxAttempts} to ${email.to_email} (${email.subject}) - next attempt in ${backoffMinutes} minutes`);
              retriedCount++;
            }
          }
        }
      } catch (error: any) {
        // Unexpected error processing this email - log but continue
        console.error(`❌ [Email Queue] Unexpected error processing email ${email.id}:`, error);
        
        // Increment attempts and mark as failed if max attempts reached
        const newAttempts = (email.attempts || 0) + 1;
        if (newAttempts >= 3) {
          await supabaseAdmin
            .from('email_queue')
            .update({
              status: 'failed',
              attempts: newAttempts,
              last_error: error.message || String(error),
            })
            .eq('id', email.id);
          failedCount++;
        } else {
          // Retry
          const backoffMinutes = newAttempts === 1 ? 5 : 15;
          const nextScheduledAt = new Date();
          nextScheduledAt.setMinutes(nextScheduledAt.getMinutes() + backoffMinutes);
          
          await supabaseAdmin
            .from('email_queue')
            .update({
              attempts: newAttempts,
              last_error: error.message || String(error),
              scheduled_at: nextScheduledAt.toISOString(),
            })
            .eq('id', email.id);
          retriedCount++;
        }
      }
    }

    console.log(`✅ [Email Queue] Processing complete: ${sentCount} sent, ${failedCount} failed, ${retriedCount} retried`);
    await recordCronSuccess(ENDPOINT);

    return NextResponse.json({
      success: true,
      processed: pendingEmails.length,
      sent: sentCount,
      failed: failedCount,
      retried: retriedCount,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ [Email Queue] Fatal error processing queue:', error);
    await recordCronFailure(ENDPOINT, error?.message ?? String(error));
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process email queue',
      },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggers (e.g., testing)
export async function POST(request: NextRequest) {
  return GET(request);
}

