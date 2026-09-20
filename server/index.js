/**
 * index.js — local entry point.
 * Starts the server on PORT. Vercel never runs this file; it uses api/index.js.
 */

'use strict';

require('dotenv').config();

const app = require('./app');

const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, () => {
  console.log('');
  console.log(`  MEDHA server running`);
  console.log(`  Site      http://localhost:${PORT}`);
  console.log(`  API       http://localhost:${PORT}/api/contact`);
  console.log(`  Health    http://localhost:${PORT}/api/health?smtp=true`);
  console.log(`  Env       ${process.env.NODE_ENV || 'development'}`);
  console.log('');
});