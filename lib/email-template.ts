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

/** Order details for swap email (DONE/EXPIRED only). Amounts are numbers; symbols are display strings (e.g. BTC, USDT). */
export interface OrderDetailsForEmail {
  fromAmount: number;
  fromSymbol: string;
  fromNetwork: string | null;
  toAmount: number;
  toSymbol: string;
  toNetwork: string | null;
  fromIconUrl?: string;
  toIconUrl?: string;
}

function formatAmountForEmail(amount: number): string {
  if (amount >= 1) return amount.toFixed(2);
  if (amount >= 0.01) return amount.toFixed(4);
  return amount.toFixed(8);
}

/**
 * Order status email template.
 * For DONE/EXPIRED with orderDetails, renders a professional swap summary matching the web UI (dark card, from → to).
 * Otherwise uses a simple status update.
 */
export function getOrderStatusEmailTemplate(
  orderId: string,
  status: string,
  orderLink: string,
  orderDetails?: OrderDetailsForEmail | null
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const domain = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const isDone = status.toLowerCase() === 'done' || status.toLowerCase() === 'completed';
  const isExpired = status.toLowerCase() === 'expired';
  const useSwapTemplate = (isDone || isExpired) && orderDetails;

  if (useSwapTemplate && orderDetails) {
    const fromAmt = formatAmountForEmail(orderDetails.fromAmount);
    const toAmt = formatAmountForEmail(orderDetails.toAmount);
    const fromLabel = orderDetails.fromNetwork ? `${orderDetails.fromSymbol} (${orderDetails.fromNetwork})` : orderDetails.fromSymbol;
    const toLabel = orderDetails.toNetwork ? `${orderDetails.toSymbol} (${orderDetails.toNetwork})` : orderDetails.toSymbol;
    const title = isDone ? 'Swap completed' : 'Order expired';
    const headline = isDone
      ? `${fromAmt} ${orderDetails.fromSymbol} to ${toAmt} ${orderDetails.toSymbol}`
      : `Order ${orderId} expired`;
    const subline = isDone
      ? 'Funds have been sent to your receiving address.'
      : 'The payment window has closed. If you already sent funds, contact support with your order ID.';

    const fromIcon = orderDetails.fromIconUrl || `https://nowpayments.io/images/coins/${orderDetails.fromSymbol.toLowerCase()}.svg`;
    const toIcon = orderDetails.toIconUrl || `https://nowpayments.io/images/coins/${orderDetails.toSymbol.toLowerCase()}.svg`;

    const year = new Date().getFullYear();

    const textVersion = `
${title}

${headline}

${subline}

Order ID: ${orderId}
View details: ${orderLink}

MintMove
${domain}
    `.trim();

    const arrowSvg =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;"><path d="M12 5v14M7 12l5 5 5-5" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const htmlVersion = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width:device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title} - MintMove</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
    .mobile-pad { padding-left: 16px !important; padding-right: 16px !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .wrapper { width: 100% !important; min-width: 100% !important; }
      .inner { padding-left: 16px !important; padding-right: 16px !important; }
      .btn { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0B0E14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0B0E14;">
    <tr>
      <td align="center" style="padding:24px 16px;" class="mobile-pad">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:520px;" class="wrapper">
          <tr>
            <td style="padding:24px 20px;background-color:#12161F;border:1px solid rgba(255,255,255,0.1);border-radius:12px;" class="inner">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align:center;padding-bottom:20px;">
                    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">MintMove</h1>
                    <p style="margin:6px 0 0;color:#94A3B8;font-size:12px;">Secure cryptocurrency exchange</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;border-top:1px solid rgba(255,255,255,0.08);">
                    <p style="margin:0 0 6px;color:#22C55E;font-size:11px;font-weight:600;letter-spacing:0.5px;">${title}</p>
                    <p style="margin:0;color:#ffffff;font-size:16px;font-weight:600;line-height:1.4;">${headline}</p>
                    <p style="margin:10px 0 0;color:#94A3B8;font-size:14px;line-height:1.5;">${subline}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;border-top:1px solid rgba(255,255,255,0.08);">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:rgba(11,14,20,0.6);border:1px solid #1E2533;border-radius:10px;">
                      <tr>
                        <td style="padding:16px 20px;vertical-align:middle;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align:middle;padding-right:12px;"><img src="${fromIcon}" alt="" width="40" height="40" style="display:block;border-radius:50%;border:0;" /></td>
                              <td>
                                <p style="margin:0;color:#64748B;font-size:11px;">You paid</p>
                                <p style="margin:4px 0 0;color:#ffffff;font-size:15px;font-weight:600;">${fromAmt} ${fromLabel}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 20px;text-align:center;">
                          <!--[if mso]>&#8595;<![endif]-->
                          <!--[if !mso]-->${arrowSvg}<!--<![endif]-->
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 20px 16px;vertical-align:middle;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align:middle;padding-right:12px;"><img src="${toIcon}" alt="" width="40" height="40" style="display:block;border-radius:50%;border:0;" /></td>
                              <td>
                                <p style="margin:0;color:#64748B;font-size:11px;">You received</p>
                                <p style="margin:4px 0 0;color:#ffffff;font-size:15px;font-weight:600;">${toAmt} ${toLabel}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 0 0;text-align:center;">
                    <a href="${orderLink}" class="btn" style="display:inline-block;padding:12px 24px;background-color:#2563EB;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">View order details</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0 0;color:#64748B;font-size:12px;word-break:break-all;">Order ID: ${orderId}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0 0;color:#64748B;font-size:12px;text-align:center;">${year} MintMove. ${domain}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return { text: textVersion, html: htmlVersion };
  }

  // Fallback: simple status update (for non-DONE/EXPIRED or missing orderDetails)
  const statusMap: Record<string, string> = {
    'done': 'Completed',
    'expired': 'Expired',
    'failed': 'Failed',
    'completed': 'Completed',
  };
  const humanStatus = statusMap[status.toLowerCase()] || status;
  const statusMessage = isDone
    ? 'Your order has been completed. Funds have been sent to your receiving address.'
    : isExpired
    ? 'Your order has expired. If you have questions, contact support with your order ID.'
    : `Your order status: ${humanStatus}.`;

  const year = new Date().getFullYear();

  const textVersion = `
Order status update

Order ${orderId}: ${humanStatus}

${statusMessage}

View order: ${orderLink}

MintMove
${domain}
  `.trim();

  const htmlVersion = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width:device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Order status - MintMove</title>
  <!--[if mso]>
  <style type="text/css"> body, table, td { font-family: Arial, sans-serif !important; } </style>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .wrapper { width: 100% !important; }
      .inner { padding-left: 16px !important; padding-right: 16px !important; }
      .btn { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0B0E14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0B0E14;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:520px;background-color:#12161F;border:1px solid rgba(255,255,255,0.1);border-radius:12px;" class="wrapper">
          <tr>
            <td style="padding:24px 20px;" class="inner">
              <h2 style="margin:0 0 12px;color:#ffffff;font-size:18px;font-weight:600;">Order ${orderId}</h2>
              <p style="margin:0 0 20px;color:#94A3B8;font-size:14px;line-height:1.5;">${statusMessage}</p>
              <a href="${orderLink}" class="btn" style="display:inline-block;padding:12px 24px;background-color:#2563EB;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">View order details</a>
            </td>
          </tr>
        </table>
        <p style="margin:12px 0 0;color:#64748B;font-size:12px;text-align:center;">${year} MintMove. ${domain}</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { text: textVersion, html: htmlVersion };
}

