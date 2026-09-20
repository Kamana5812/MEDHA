/**
 * rateLimiter.js
 * ---------------------------------------------------------------
 * Without this, one script can send thousands of emails through your
 * SMTP account in a minute — which gets the account suspended long
 * before it gets the inbox cleaned out.
 *
 * Note: the default in-memory store is per-instance. That is fine for a
 * single server, and on serverless it still blunts a burst hitting one
 * warm instance. For strict global limits, back it with Redis/Upstash.
 */

'use strict';

const rateLimit = require('express-rate-limit');

const windowMinutes = Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15);
const max = Number(process.env.RATE_LIMIT_MAX || 5);

const contactLimiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max,
  standardHeaders: true, // RateLimit-* headers so clients can self-throttle
  legacyHeaders: false,
  // Override the default plain-text body to keep every response JSON.
  handler: (req, res) =>
    res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: `Too many submissions. Please try again in about ${windowMinutes} minutes.`,
    }),
});

module.exports = { contactLimiter, windowMinutes, max };