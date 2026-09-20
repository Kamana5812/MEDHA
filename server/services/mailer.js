/**
 * mailer.js
 * ---------------------------------------------------------------
 * Everything SMTP lives here. The route knows "send this enquiry";
 * it does not know which provider, port, or TLS mode is in play.
 *
 * The transporter is created once and cached at module scope. On Vercel
 * a warm serverless instance reuses it across invocations, which avoids
 * re-doing the TCP + TLS + AUTH handshake on every submission.
 */

'use strict';

const nodemailer = require('nodemailer');

let cachedTransporter = null;

/** Fail loudly at startup rather than mysteriously at send time. */
function requireEnv(key) {
  const value = process.env[key];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const port = Number(process.env.SMTP_PORT || 587);

  cachedTransporter = nodemailer.createTransport({
    host: requireEnv('SMTP_HOST'),
    port,
    // Implicit TLS on 465; STARTTLS upgrade on 587/2525.
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true' || port === 465,
    auth: {
      user: requireEnv('SMTP_USER'),
      pass: requireEnv('SMTP_PASS'),
    },
    // Serverless functions are short-lived; don't wait forever on a dead host.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return cachedTransporter;
}

/** Escape HTML so a submitted `<script>` renders as text in the inbox. */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strip CR/LF from anything interpolated into a mail header.
 * Without this, a "subject" containing a newline could inject extra
 * headers such as Bcc — the classic email header injection attack.
 */
function sanitizeHeader(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function buildHtml({ name, email, subject, message, meta }) {
  const rows = [
    ['Name', escapeHtml(name)],
    ['Email', `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`],
    ['Subject', escapeHtml(subject)],
    ['Received', escapeHtml(meta.receivedAt)],
    ['IP', escapeHtml(meta.ip)],
  ]
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 14px;background:#f6f7fb;font-weight:600;
                     border-bottom:1px solid #e5e7eb;width:110px;">${label}</td>
          <td style="padding:8px 14px;border-bottom:1px solid #e5e7eb;">${value}</td>
        </tr>`
    )
    .join('');

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
              max-width:640px;margin:0 auto;color:#111827;">
    <h2 style="margin:0 0 4px;font-size:18px;">New enquiry from the MEDHA website</h2>
    <p style="margin:0 0 18px;color:#6b7280;font-size:13px;">
      Reply directly to this email to respond to the sender.
    </p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;
                  border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
      ${rows}
    </table>
    <h3 style="font-size:14px;margin:20px 0 6px;">Message</h3>
    <div style="white-space:pre-wrap;line-height:1.6;font-size:14px;
                background:#fafafa;border-left:3px solid #6366f1;padding:12px 14px;">
${escapeHtml(message)}
    </div>
  </div>`;
}

function buildText({ name, email, subject, message, meta }) {
  return [
    'New enquiry from the MEDHA website',
    '----------------------------------',
    `Name:     ${name}`,
    `Email:    ${email}`,
    `Subject:  ${subject}`,
    `Received: ${meta.receivedAt}`,
    `IP:       ${meta.ip}`,
    '',
    'Message:',
    message,
  ].join('\n');
}

/**
 * Deliver a validated enquiry to the company inbox.
 * Throws on SMTP failure so the route can map it to a 502.
 */
async function sendContactEmail(enquiry, meta) {
  const payload = { ...enquiry, meta };

  const info = await getTransporter().sendMail({
    from: process.env.MAIL_FROM || requireEnv('SMTP_USER'),
    to: requireEnv('MAIL_TO'),
    // The visitor is NOT the sender — SPF/DKIM would fail and the mail
    // would land in spam. They go in Reply-To instead, so hitting
    // "Reply" in the inbox still reaches them.
    //
    // Passing an object rather than a "Name <addr>" string lets nodemailer
    // quote and encode the display name. A name like `X <evil@attacker.com>`
    // would otherwise smuggle a second address into the header.
    replyTo: {
      name: sanitizeHeader(enquiry.name).replace(/[<>"';,]/g, ''),
      address: sanitizeHeader(enquiry.email),
    },
    subject: sanitizeHeader(`[MEDHA Contact] ${enquiry.subject}`),
    text: buildText(payload),
    html: buildHtml(payload),
  });

  return { messageId: info.messageId };
}

/** Used by the health check and `npm run verify:smtp`. */
async function verifyConnection() {
  await getTransporter().verify();
  return true;
}

module.exports = { sendContactEmail, verifyConnection, escapeHtml, sanitizeHeader };