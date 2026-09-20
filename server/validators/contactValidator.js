/**
 * contactValidator.js
 * ---------------------------------------------------------------
 * Pure validation logic for the contact payload.
 *
 * Deliberately written without a validation library so the rules are
 * visible and auditable. It returns a report; it never sends a response
 * and never throws. Deciding the HTTP status is the route's job.
 *
 * Golden rule of API design: the client's validation is a convenience,
 * the server's validation is the actual boundary. Anyone can send a
 * request with curl and skip your JavaScript entirely.
 */

'use strict';

/** Field rules in one place, so they can be reused by tests and docs. */
const RULES = {
  name: { min: 2, max: 80 },
  email: { max: 254 }, // RFC 5321 maximum path length
  subject: { min: 3, max: 120 },
  message: { min: 10, max: 2000 },
};

/**
 * Pragmatic email pattern. Full RFC 5322 compliance is famously
 * unreadable and rejects almost nothing extra in practice; the real
 * proof that an address exists is a message arriving at it.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

/** Control characters (except tab/newline/carriage return) have no business in a form. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Normalise an incoming value to a clean string.
 * Non-strings become '' rather than "[object Object]" or "null",
 * so `{ "name": { "$ne": null } }` is treated as an empty name.
 */
function toCleanString(value) {
  if (typeof value !== 'string') return '';
  return value.replace(CONTROL_CHARS, '').trim();
}

/** Collapse runs of whitespace — "John     Doe" becomes "John Doe". */
function collapseSpaces(value) {
  return value.replace(/[ \t]{2,}/g, ' ');
}

/**
 * Validate a raw request body.
 *
 * @param {unknown} body
 * @returns {{ valid: boolean, errors: Object<string,string>, data: Object }}
 */
function validateContact(body) {
  const errors = {};

  // Guard the container itself. A JSON array or a bare string parses
  // fine but is not an object, and would otherwise crash on property access.
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      valid: false,
      errors: { body: 'Request body must be a JSON object.' },
      data: {},
    };
  }

  const name = collapseSpaces(toCleanString(body.name));
  const email = toCleanString(body.email).toLowerCase();
  const subject = collapseSpaces(toCleanString(body.subject));
  const message = toCleanString(body.message);

  // ---------- name ----------
  if (!name) {
    errors.name = 'Name is required.';
  } else if (name.length < RULES.name.min) {
    errors.name = `Name must be at least ${RULES.name.min} characters.`;
  } else if (name.length > RULES.name.max) {
    errors.name = `Name must be ${RULES.name.max} characters or fewer.`;
  }

  // ---------- email ----------
  if (!email) {
    errors.email = 'Email is required.';
  } else if (email.length > RULES.email.max) {
    errors.email = `Email must be ${RULES.email.max} characters or fewer.`;
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  // ---------- subject ----------
  if (!subject) {
    errors.subject = 'Subject is required.';
  } else if (subject.length < RULES.subject.min) {
    errors.subject = `Subject must be at least ${RULES.subject.min} characters.`;
  } else if (subject.length > RULES.subject.max) {
    errors.subject = `Subject must be ${RULES.subject.max} characters or fewer.`;
  }

  // ---------- message ----------
  if (!message) {
    errors.message = 'Message is required.';
  } else if (message.length < RULES.message.min) {
    errors.message = `Message must be at least ${RULES.message.min} characters.`;
  } else if (message.length > RULES.message.max) {
    errors.message = `Message must be ${RULES.message.max} characters or fewer.`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: { name, email, subject, message },
  };
}

module.exports = { validateContact, RULES, EMAIL_PATTERN };