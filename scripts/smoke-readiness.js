#!/usr/bin/env node
const {
  fail,
  fetchJson,
  getBaseUrl,
  getRequiredEnv,
  info,
  loadLocalEnv
} = require('./smoke-utils');

async function main() {
  loadLocalEnv();
  const baseUrl = getBaseUrl();
  const internalSecret = getRequiredEnv('BOOKING_API_AUTH_SECRET');
  const readyzPath = process.env.SMOKE_READINESS_PATH || '/api/readyz';
  const outboxPath = process.env.SMOKE_OUTBOX_JOB_PATH || '/api/internal/jobs/process-outbox';
  const sweepPath = process.env.SMOKE_SWEEP_JOB_PATH || '/api/internal/jobs/run-recovery-sweeps';

  info(`GET ${readyzPath}`);
  const readyz = await fetchJson(`${baseUrl}${readyzPath}`);
  if (!readyz.response.ok || !readyz.body || readyz.body.ok !== true) {
    fail(`Readiness smoke failed with ${readyz.response.status}: ${JSON.stringify(readyz.body)}`);
  }

  info(`POST ${outboxPath}`);
  const outbox = await fetchJson(`${baseUrl}${outboxPath}`, {
    method: 'POST',
    headers: {
      'x-internal-job-secret': internalSecret
    }
  });
  if (!outbox.response.ok) {
    fail(`Outbox job smoke failed with ${outbox.response.status}: ${JSON.stringify(outbox.body)}`);
  }

  info(`POST ${sweepPath}`);
  const sweeps = await fetchJson(`${baseUrl}${sweepPath}`, {
    method: 'POST',
    headers: {
      'x-internal-job-secret': internalSecret
    }
  });
  if (!sweeps.response.ok) {
    fail(`Sweep job smoke failed with ${sweeps.response.status}: ${JSON.stringify(sweeps.body)}`);
  }

  console.log('PASS: Readiness smoke succeeded.');
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
