#!/usr/bin/env node
/**
 * verify-smtp.js — run with `npm run verify:smtp`
 *
 * Checks credentials BEFORE you start debugging the frontend. Most
 * "my form doesn't work" bugs are actually a wrong SMTP password.
 */

'use strict';

require('dotenv').config();

const { verifyConnection, sendContactEmail } = require('../services/mailer');

(async () => {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_TO'];
  const missing = required.filter((k) => !process.env[k]);

  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  console.log(`Connecting to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} ...`);

  try {
    await verifyConnection();
    console.log('SMTP connection and authentication OK.');
  } catch (err) {
    console.error('SMTP verification failed:', err.message);
    console.error('\nCommon causes:');
    console.error('  - Using your account password instead of an App Password (Gmail)');
    console.error('  - SMTP_SECURE=true on port 587 (it should be false)');
    console.error('  - Provider blocking sign-in from a new location');
    process.exit(1);
  }

  if (process.argv.includes('--send')) {
    console.log('Sending a test enquiry ...');
    const { messageId } = await sendContactEmail(
      {
        name: 'SMTP Test',
        email: 'test@example.com',
        subject: 'Deliverability check',
        message: 'If this arrived, the full Frontend -> API -> SMTP chain works.',
      },
      { ip: '127.0.0.1', receivedAt: new Date().toISOString() }
    );
    console.log(`Sent. Message ID: ${messageId}`);
    console.log(`Check the inbox for ${process.env.MAIL_TO} (and its spam folder).`);
  } else {
    console.log('Tip: run `npm run verify:smtp -- --send` to also send a test email.');
  }
})();