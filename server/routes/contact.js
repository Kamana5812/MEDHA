/**
 * routes/contact.js
 * ---------------------------------------------------------------
 * POST /api/contact
 *
 * Request pipeline:
 *   rate limiter -> JSON parser -> honeypot -> validator -> mailer -> response
 *
 * Every exit path returns JSON with the same shape, so the frontend
 * never has to guess whether it received JSON or an HTML error page.
 */

'use strict';

const express = require('express');
const { validateContact, RULES } = require('../validators/contactValidator');
const { sendContactEmail } = require('../services/mailer');
const { contactLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/** Consistent success envelope. */
function ok(res, message, extra = {}) {
  return res.status(200).json({ success: true, message, ...extra });
}

/** Consistent failure envelope. `code` is machine-readable, `message` is for humans. */
function fail(res, status, code, message, errors) {
  const body = { success: false, code, message };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
}

/** Best-effort client IP, trusting only the proxy header Vercel sets. */
function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

/**
 * GET /api/contact — not a valid way to submit, but returning the rules
 * here is genuinely useful: the frontend can read the limits instead of
 * hardcoding them in two places that drift apart.
 */
router.get('/contact', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Send a POST request to this endpoint to submit an enquiry.',
    rules: RULES,
    required: ['name', 'email', 'subject', 'message'],
  });
});

router.post('/contact', contactLimiter, async (req, res, next) => {
  try {
    // ---- 1. Content-Type check -------------------------------------
    // express.json() silently leaves req.body empty for a wrong type,
    // which would otherwise surface as a confusing "all fields required".
    if (!req.is('application/json')) {
      return fail(
        res,
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Content-Type must be application/json.'
      );
    }

    // ---- 2. Honeypot ------------------------------------------------
    // A hidden field no human ever sees. Bots fill every input they find,
    // so a non-empty value is a strong bot signal. Respond 200 so the bot
    // believes it succeeded and does not retry with a different strategy.
    if (typeof req.body?.website === 'string' && req.body.website.trim() !== '') {
      console.warn(`[contact] honeypot triggered from ${clientIp(req)}`);
      return ok(res, 'Thanks! Your message has been received.');
    }

    // ---- 3. Validation ---------------------------------------------
    const { valid, errors, data } = validateContact(req.body);

    if (!valid) {
      // 422 means "I understood the JSON, but the values are unacceptable".
      // Plain 400 is also defensible; the important part is being consistent.
      return fail(
        res,
        422,
        'VALIDATION_ERROR',
        'Please correct the highlighted fields.',
        errors
      );
    }

    // ---- 4. Delivery ------------------------------------------------
    const meta = { ip: clientIp(req), receivedAt: new Date().toISOString() };
    const { messageId } = await sendContactEmail(data, meta);

    console.log(`[contact] delivered ${messageId} from ${data.email}`);

    return ok(res, "Thanks for reaching out! We'll reply within 1-2 business days.", {
      reference: messageId,
    });
  } catch (err) {
    // SMTP problems are the API's fault, not the user's — hence 5xx.
    // Never leak credentials or raw provider errors to the client.
    if (err && (err.code || err.responseCode || /SMTP|ECONN|ETIMEDOUT/i.test(err.message))) {
      console.error('[contact] SMTP failure:', err.message);
      return fail(
        res,
        502,
        'MAIL_DELIVERY_FAILED',
        'We could not send your message right now. Please email us directly at ' +
          (process.env.MAIL_TO || 'hello@medha-education.com') +
          '.'
      );
    }
    return next(err);
  }
});

/**
 * Anything that is not POST or GET on this path gets 405 with an Allow
 * header, which is what the spec asks for.
 */
router.all('/contact', (req, res) => {
  res.set('Allow', 'GET, POST, OPTIONS');
  return fail(
    res,
    405,
    'METHOD_NOT_ALLOWED',
    `${req.method} is not supported on /api/contact. Use POST.`
  );
});

module.exports = router;