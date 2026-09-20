/**
 * app.js
 * ---------------------------------------------------------------
 * Builds and exports the Express application — no listening here.
 * server/index.js starts it locally; api/index.js hands it to Vercel.
 * That separation is what lets the same code run in both places.
 *
 * Middleware order matters and reads top to bottom as the request travels:
 *   helmet -> cors -> json parser -> routes -> 404 -> error handler
 */

'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const contactRoutes = require('./routes/contact');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { verifyConnection } = require('./services/mailer');

const app = express();

// Vercel and most hosts sit behind a proxy. Without this, req.ip is the
// proxy's address and the rate limiter would treat all visitors as one.
app.set('trust proxy', 1);

// Strip the header that advertises "Express" to anyone scanning for targets.
app.disable('x-powered-by');

// ---------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------
app.use(
  helmet({
    // The site loads GSAP/Three.js from a CDN, so the default strict CSP
    // would break the page. Tighten this once you audit the exact sources.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// ---------------------------------------------------------------
// CORS — an allowlist, not a wildcard
// ---------------------------------------------------------------
// `origin: '*'` would let any website on the internet post through your
// SMTP account. The allowlist comes from an env var so staging, local,
// and production each get their own without a code change.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // No Origin header: curl, Postman, server-to-server, same-origin form posts.
    if (!origin) return callback(null, true);

    // Empty allowlist in development means "don't block me while I'm learning".
    if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true);
    }

    const err = new Error(`Origin ${origin} is not allowed by CORS.`);
    err.code = 'CORS_NOT_ALLOWED';
    return callback(err);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400, // cache the preflight for a day
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // answer preflight before anything else runs

// ---------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------
// A contact form needs a few KB. The cap turns a "memory exhaustion"
// attack into a cheap 413.
app.use(express.json({ limit: '10kb' }));

// ---------------------------------------------------------------
// Health check — is the app up, and can it actually reach SMTP?
// ---------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  const body = {
    success: true,
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  };

  if (req.query.smtp === 'true') {
    try {
      await verifyConnection();
      body.smtp = 'connected';
    } catch (err) {
      body.smtp = 'unreachable';
      body.smtpError = err.message;
    }
  }

  res.status(200).json(body);
});

// ---------------------------------------------------------------
// API routes
// ---------------------------------------------------------------
app.use('/api', contactRoutes);

// ---------------------------------------------------------------
// Static site (local development convenience).
// On Vercel the static files are served by the CDN, not by Express.
// ---------------------------------------------------------------
if (!process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '..')));
}

// ---------------------------------------------------------------
// Fallbacks — must be registered last
// ---------------------------------------------------------------
app.use('/api', notFoundHandler);
app.use(errorHandler);

module.exports = app;