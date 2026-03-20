#!/usr/bin/env node
const {
  fail,
  fetchJson,
  getBaseUrl,
  info,
  loadLocalEnv,
  parseJsonEnv
} = require('./smoke-utils');

async function main() {
  loadLocalEnv();
  const baseUrl = getBaseUrl();
  const prebookPath = process.env.SMOKE_PREBOOK_PATH || '/api/booking/prebook';
  const finalizePath = process.env.SMOKE_FINALIZE_PATH || '/api/booking/book';
  const prebookPayload = parseJsonEnv('SMOKE_PREBOOK_PAYLOAD');
  const finalizePayload = parseJsonEnv('SMOKE_FINALIZE_PAYLOAD', {});
  const expectedFinalizeStatus = Number(process.env.SMOKE_FINALIZE_EXPECTED_STATUS || '401');

  if (!prebookPayload) {
    fail('SMOKE_PREBOOK_PAYLOAD is required for booking smoke coverage.');
  }

  info(`POST ${prebookPath}`);
  const prebook = await fetchJson(`${baseUrl}${prebookPath}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(prebookPayload)
  });

  if (!prebook.response.ok) {
    fail(`Prebook smoke failed with ${prebook.response.status}: ${JSON.stringify(prebook.body)}`);
  }

  info(`POST ${finalizePath} expecting ${expectedFinalizeStatus}`);
  const finalize = await fetchJson(`${baseUrl}${finalizePath}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(finalizePayload)
  });

  if (finalize.response.status !== expectedFinalizeStatus) {
    fail(`Finalize smoke expected ${expectedFinalizeStatus} but got ${finalize.response.status}: ${JSON.stringify(finalize.body)}`);
  }

  console.log('PASS: Booking smoke succeeded.');
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
