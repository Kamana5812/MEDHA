/**
 * errorHandler.js
 * ---------------------------------------------------------------
 * The safety net. Anything thrown or passed to next(err) anywhere in
 * the app arrives here and leaves as JSON — never as Express's default
 * HTML stack trace, which leaks file paths in production.
 */

'use strict';

/** 404 for unknown API paths. Registered after all routes. */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `No API route matches ${req.method} ${req.originalUrl}.`,
  });
}

/** Express recognises this as an error handler only because it has 4 args. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Body exceeded the express.json() size limit.
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request body is too large.',
    });
  }

  // Malformed JSON — a stray comma, a truncated body.
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      code: 'MALFORMED_JSON',
      message: 'Request body is not valid JSON.',
    });
  }

  // Origin rejected by the CORS allowlist.
  if (err.code === 'CORS_NOT_ALLOWED') {
    return res.status(403).json({
      success: false,
      code: 'CORS_NOT_ALLOWED',
      message: 'This origin is not permitted to use the API.',
    });
  }

  console.error('[unhandled]', err);

  const body = {
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong on our end. Please try again later.',
  };

  // Stack traces are a development aid, not a production feature.
  if (process.env.NODE_ENV !== 'production') {
    body.debug = { name: err.name, message: err.message };
  }

  res.status(err.status || 500).json(body);
}

module.exports = { notFoundHandler, errorHandler };