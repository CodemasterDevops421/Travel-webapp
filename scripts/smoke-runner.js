#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const scripts = [
  'scripts/smoke-booking.js',
  'scripts/smoke-webhooks.js',
  'scripts/smoke-admin.js',
  'scripts/smoke-readiness.js'
];

for (const script of scripts) {
  const result = spawnSync(process.execPath, [script], {
    stdio: 'inherit',
    env: process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('PASS: All smoke gates succeeded.');
