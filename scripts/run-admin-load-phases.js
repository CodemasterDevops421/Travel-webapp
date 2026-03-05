#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BASE_URL = process.env.PERF_BASE_URL || 'http://localhost:3000';
const ADMIN_JWT = process.env.ADMIN_JWT || '';
const DURATION = process.env.PERF_STAGE_DURATION || '2m';

const stages = [
  { name: '100', factor: 1 },
  { name: '500', factor: 5 },
  { name: '1000', factor: 10 },
  { name: '2000', factor: 20 }
];

const outputDir = path.join(process.cwd(), 'docs', 'perf', 'admin-load-results');
fs.mkdirSync(outputDir, { recursive: true });

function runStage(stage) {
  const summaryPath = path.join(outputDir, `k6-summary-${stage.name}.json`);
  const env = {
    ...process.env,
    PERF_BASE_URL: BASE_URL,
    ADMIN_JWT,
    K6_DURATION: DURATION,
    K6_RATE_RECONCILIATION: String(25 * stage.factor),
    K6_RATE_RECON_EXPORT: String(10 * stage.factor),
    K6_RATE_SUPPORT_OPS: String(20 * stage.factor),
    K6_VUS_RECONCILIATION: String(200 * stage.factor),
    K6_VUS_RECON_EXPORT: String(120 * stage.factor),
    K6_VUS_SUPPORT_OPS: String(160 * stage.factor)
  };

  console.log(`[admin-load] stage=${stage.name} duration=${DURATION}`);
  const result = spawnSync(
    'k6',
    ['run', '--summary-export', summaryPath, 'load/admin-reports.k6.js'],
    {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
      shell: true
    }
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`k6 stage ${stage.name} failed with status ${result.status}`);
  }
}

function main() {
  if (!ADMIN_JWT) {
    console.error('[admin-load] Missing ADMIN_JWT environment variable');
    process.exit(1);
  }

  for (const stage of stages) {
    runStage(stage);
  }

  console.log(`[admin-load] completed staged run. summaries in ${outputDir}`);
}

main();
