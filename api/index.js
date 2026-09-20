/**
 * api/index.js — Vercel serverless entry point.
 *
 * Vercel turns each file in /api into a serverless function. Exporting the
 * Express app lets Vercel invoke it as a request handler, so the same
 * routing and middleware that runs locally also runs in production —
 * no separate "serverless version" of the code to keep in sync.
 *
 * vercel.json rewrites every /api/* request to this single function.
 */

'use strict';

module.exports = require('../server/app');