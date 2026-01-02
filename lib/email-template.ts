export function getVerificationEmailTemplate(verificationUrl: string, email: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const domain = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Plain text version (important for spam filters)
  const textVersion = `
Welcome to MintMove!

Thank you for creating an account. To complete your registration, please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 24 hours.

If you did not create an account with MintMove, please ignore this email.

Best regards,
The MintMove Team
${domain}
  `.trim();

  // HTML version with professional design
  const htmlVersion = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verify Your Email - MintMove</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">MintMove</h1>
              <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 14px;">Secure Cryptocurrency Exchange</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600; line-height: 1.3;">Welcome to MintMove!</h2>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Thank you for creating an account with MintMove. We're excited to have you on board!
              </p>

              <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                To complete your registration and start using our platform, please verify your email address by clicking the button below:
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px;">Verify Email Address</a>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px; padding: 12px; background-color: #f3f4f6; border-radius: 4px; word-break: break-all; color: #1f2937; font-size: 13px; line-height: 1.5; font-family: 'Courier New', monospace;">
                ${verificationUrl}
              </p>

              <!-- Security Notice -->
              <div style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 30px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  <strong>Security Notice:</strong> This verification link will expire in 24 hours. If you did not create an account with MintMove, please ignore this email.
                </p>
              </div>

              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px; line-height: 1.6; text-align: center;">
                This email was sent to <strong style="color: #1f2937;">${email}</strong>
              </p>
              <p style="margin: 0 0 12px; color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center;">
                © ${new Date().getFullYear()} MintMove. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center;">
                ${domain}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return {
    text: textVersion,
    html: htmlVersion,
  };
}

/**
 * Order status email template
 * Follows the same HTML structure as verification email
 */
export function getOrderStatusEmailTemplate(orderId: string, status: string, orderLink: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const domain = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Map status to human-readable format
  const statusMap: Record<string, string> = {
    'done': 'Completed',
    'expired': 'Expired',
    'processing_by_provider': 'Processing',
    'failed': 'Failed',
    'completed': 'Completed',
    'processing': 'Processing',
  };
  const humanStatus = statusMap[status.toLowerCase()] || status;

  // Status-specific messages
  const statusMessages: Record<string, string> = {
    'Completed': 'Your order has been completed successfully!',
    'Expired': 'Your order has expired. If you have any questions, please contact support.',
    'Processing': 'Your order is now being processed. You will be notified once it completes.',
    'Failed': 'Your order has failed. Please contact support for assistance.',
  };
  const statusMessage = statusMessages[humanStatus] || `Your order status has been updated to: ${humanStatus}`;

  // Plain text version
  const textVersion = `
Order Status Update

Your order ${orderId} status has been updated to: ${humanStatus}

${statusMessage}

View order details: ${orderLink}

If you have any questions, please contact our support team.

Best regards,
The MintMove Team
${domain}
  `.trim();

  // HTML version with professional design
  const htmlVersion = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Order Status Update - MintMove</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">MintMove</h1>
              <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 14px;">Secure Cryptocurrency Exchange</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600; line-height: 1.3;">Order Status Update</h2>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Your order <strong style="color: #1f2937;">${orderId}</strong> status has been updated to: <strong style="color: #1f2937;">${humanStatus}</strong>
              </p>

              <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                ${statusMessage}
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${orderLink}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px;">View Order Details</a>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px; padding: 12px; background-color: #f3f4f6; border-radius: 4px; word-break: break-all; color: #1f2937; font-size: 13px; line-height: 1.5; font-family: 'Courier New', monospace;">
                ${orderLink}
              </p>

              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 12px; color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center;">
                © ${new Date().getFullYear()} MintMove. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center;">
                ${domain}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return {
    text: textVersion,
    html: htmlVersion,
  };
}

