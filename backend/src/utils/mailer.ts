import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTPEmail = async (toEmail: string, otp: string) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        requireTLS: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Account Setup</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:36px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:30px 36px 26px;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:#93c5fd;text-transform:uppercase;">Transport Management System</p>
            <h1 style="margin:10px 0 4px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">First-Time Account Setup</h1>
            <p style="margin:0;font-size:13px;color:#bfdbfe;">Follow the steps below to activate your account</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px 0;">
            <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#0f172a;">Welcome to TMS</p>
            <p style="margin:0 0 28px;font-size:14px;color:#475569;line-height:1.7;">
              A sign-in attempt was made using your address. Because this is your first time accessing the system,
              please use the code below to complete your account setup.
            </p>

            <!-- OTP block — triple-click to select -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="background:#f0f9ff;border:2px solid #bae6fd;border-radius:10px;padding:22px 16px;">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;color:#0369a1;text-transform:uppercase;">Your one-time code</p>
                  <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:38px;font-weight:700;color:#1e3a5f;letter-spacing:10px;line-height:1;">${otp}</p>
                  <p style="margin:10px 0 0;font-size:11px;color:#64748b;">Select the number above to copy it</p>
                </td>
              </tr>
            </table>

            <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;">
              &#x23F1;&nbsp;Valid for <strong style="color:#0f172a;">10 minutes</strong> &mdash; single use only.
            </p>

            <!-- Divider -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
              <tr><td style="height:1px;background:#e2e8f0;"></td></tr>
            </table>

            <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;line-height:1.7;">
              If you did not initiate this, your address may have been entered by mistake.
              No action is required on your part, and your account remains secure.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 36px 28px;">
            <p style="margin:0;font-size:11px;color:#cbd5e1;line-height:1.6;">
              Automated message from the Transport Management System &mdash; please do not reply to this address.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const text =
        `Transport Management System — Account Setup\n\n` +
        `A sign-in attempt was made using your address. Since this is your first access,\n` +
        `please use the code below to complete your account setup.\n\n` +
        `Your code: ${otp}\n\n` +
        `This code is valid for 10 minutes and can only be used once.\n\n` +
        `If you did not initiate this, no action is needed.\n\n` +
        `---\nAutomated message — do not reply.`;

    return transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: toEmail,
        subject: 'TMS Account Setup — Your Access Code',
        text,
        html,
    });
};

export const sendPasswordResetOTPEmail = async (toEmail: string, otp: string) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        requireTLS: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Account Code Request</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:36px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:30px 36px 26px;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:#93c5fd;text-transform:uppercase;">Transport Management System</p>
            <h1 style="margin:10px 0 4px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">Account Access Code</h1>
            <p style="margin:0;font-size:13px;color:#bfdbfe;">A code was requested for your TMS account</p>
          </td>
        </tr>

        <!-- Security notice banner -->
        <tr>
          <td style="background:#fff7ed;border-bottom:1px solid #fed7aa;padding:12px 36px;">
            <p style="margin:0;font-size:12px;color:#9a3412;font-weight:600;">
              &#x26A0;&#xFE0F;&nbsp; If you did not make this request, you can safely disregard this message.
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px 0;">
            <p style="margin:0 0 28px;font-size:14px;color:#475569;line-height:1.7;">
              We received a request to issue an access code for this address.
              Enter the code below to proceed. This code is single-use and time-limited.
            </p>

            <!-- OTP block — triple-click to select -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="background:#fff1f2;border:2px solid #fecaca;border-radius:10px;padding:22px 16px;">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;color:#b91c1c;text-transform:uppercase;">Your one-time code</p>
                  <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:38px;font-weight:700;color:#7f1d1d;letter-spacing:10px;line-height:1;">${otp}</p>
                  <p style="margin:10px 0 0;font-size:11px;color:#64748b;">Select the number above to copy it</p>
                </td>
              </tr>
            </table>

            <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;">
              &#x23F1;&nbsp;Valid for <strong style="color:#0f172a;">10 minutes</strong> &mdash; single use only.
            </p>

            <!-- Divider -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
              <tr><td style="height:1px;background:#e2e8f0;"></td></tr>
            </table>

            <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;line-height:1.7;">
              For your security: TMS staff will never ask you to share this code over the phone or by message.
              Do not pass this code to anyone.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 36px 28px;">
            <p style="margin:0;font-size:11px;color:#cbd5e1;line-height:1.6;">
              Automated message from the Transport Management System &mdash; please do not reply to this address.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const text =
        `Transport Management System — Account Access Code\n\n` +
        `We received a request to issue an access code for this address.\n\n` +
        `Your code: ${otp}\n\n` +
        `This code is valid for 10 minutes and can only be used once.\n\n` +
        `If you did not make this request, no action is needed and your account remains secure.\n` +
        `TMS staff will never ask you to share this code.\n\n` +
        `---\nAutomated message — do not reply.`;

    return transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: toEmail,
        subject: 'TMS Account Reset Code',
        text,
        html,
    });
};

// ─── Shared transporter factory ──────────────────────────────────────────────
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        requireTLS: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
}

// ─── Shared HTML wrapper ─────────────────────────────────────────────────────
function buildEmailHtml(opts: {
    badgeColor: { bg: string; text: string; border: string };
    badgeLabel: string;
    headline: string;
    subheadline: string;
    rows: { label: string; value: string }[];
    bodyNote?: string;
    ctaLabel: string;
    ctaUrl?: string;
}): string {
    const rowsHtml = opts.rows.map(r => `
        <tr>
            <td style="padding:8px 12px;font-size:12px;color:#6b7280;font-weight:600;white-space:nowrap;width:140px;">${r.label}</td>
            <td style="padding:8px 12px;font-size:13px;color:#111827;font-weight:500;">${r.value}</td>
        </tr>`).join('');

    const ctaHref = opts.ctaUrl ?? '#';
    const ctaNote = opts.ctaUrl
        ? ''
        : `<p style="margin:8px 0 0;font-size:11px;color:#6b7280;">No app URL configured — please open TMS manually.</p>`;

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

        <!-- Header bar -->
        <tr><td style="background:#1e3a5f;padding:28px 32px;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:#93c5fd;text-transform:uppercase;">Transport Management System</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;">${opts.headline}</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#bfdbfe;">${opts.subheadline}</p>
        </td></tr>

        <!-- Badge -->
        <tr><td style="padding:20px 32px 0;">
          <span style="display:inline-block;padding:4px 14px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;background:${opts.badgeColor.bg};color:${opts.badgeColor.text};border:1px solid ${opts.badgeColor.border};">${opts.badgeLabel}</span>
        </td></tr>

        <!-- Detail table -->
        <tr><td style="padding:16px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
            <tbody style="background:#f9fafb;">${rowsHtml}</tbody>
          </table>
        </td></tr>

        ${opts.bodyNote ? `
        <!-- Note -->
        <tr><td style="padding:16px 32px 0;">
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;font-size:12px;color:#92400e;line-height:1.6;">
            <strong>Justification:</strong> ${opts.bodyNote}
          </div>
        </td></tr>` : ''}

        <!-- CTA -->
        <tr><td style="padding:24px 32px;">
          <a href="${ctaHref}" style="display:inline-block;padding:12px 28px;background:#1e3a5f;color:#ffffff;font-size:13px;font-weight:700;border-radius:8px;text-decoration:none;">${opts.ctaLabel}</a>
          ${ctaNote}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">This is an automated notification from the Transport Management System. Do not reply to this email.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Sent to the CEO when a staff member submits a special transport request.
 */
export const sendSpecialRequestCEOEmail = async (
    toEmail: string,
    requestId: number,
    requesterName: string,
    division: string,
    justification: string
) => {
    const transporter = createTransporter();
    // Prefer explicit frontend URL for user-facing links; fallback keeps legacy config working.
    const baseUrl = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || '').replace(/\/$/, '');
    const ctaUrl = baseUrl ? `${baseUrl}/requests/${requestId}` : undefined;
    const html = buildEmailHtml({
        badgeColor: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
        badgeLabel: 'Action Required — Pending Your Approval',
        headline: `Special Transport Request #${requestId}`,
        subheadline: 'A special transport request has been submitted and is awaiting your approval.',
        rows: [
            { label: 'Request ID',    value: `#${requestId}` },
            { label: 'Requested By',  value: requesterName },
            { label: 'Division',      value: division },
            { label: 'Status',        value: 'Pending CEO Approval' },
        ],
        bodyNote: justification || 'No justification provided.',
        ctaLabel: 'Review Request in TMS',
        ctaUrl,
    });
    return transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: toEmail,
        subject: `[Action Required] Special Transport Request #${requestId} – Pending Your Approval`,
        text: `Special Transport Request #${requestId} submitted by ${requesterName} (${division}) is pending your approval.\n\nJustification: ${justification || 'Not provided'}\n\n${ctaUrl ? `Review it here: ${ctaUrl}` : 'Please log in to TMS to review.'}`,
        html,
    });
};

/**
 * Sent to Transport officers when the CEO approves a special transport request.
 */
export const sendSpecialRequestApprovedTransportEmail = async (
    toEmail: string,
    requestId: number,
    requesterName: string,
    division: string
) => {
    const transporter = createTransporter();
    // Prefer explicit frontend URL for user-facing links; fallback keeps legacy config working.
    const baseUrl = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || '').replace(/\/$/, '');
    const ctaUrl = baseUrl ? `${baseUrl}/requests/${requestId}` : undefined;
    const html = buildEmailHtml({
        badgeColor: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
        badgeLabel: 'Approved by CEO — Allocate Vehicle',
        headline: `Special Request #${requestId} Approved`,
        subheadline: 'The CEO has approved this special transport request. Please allocate a vehicle and driver.',
        rows: [
            { label: 'Request ID',    value: `#${requestId}` },
            { label: 'Requested By',  value: requesterName },
            { label: 'Division',      value: division },
            { label: 'Approved By',   value: 'CEO' },
            { label: 'Next Step',     value: 'Allocate vehicle & driver in TMS' },
        ],
        ctaLabel: 'Open TMS to Allocate',
        ctaUrl,
    });
    return transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: toEmail,
        subject: `[Action Required] Special Transport Request #${requestId} – Approved by CEO`,
        text: `Special Transport Request #${requestId} from ${requesterName} (${division}) has been approved by the CEO.\n\n${ctaUrl ? `Open it here: ${ctaUrl}` : 'Please log in to TMS to allocate a vehicle.'}`,
        html,
    });
};
