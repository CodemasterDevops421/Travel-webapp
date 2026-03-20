#!/usr/bin/env node
/* eslint-disable no-console */
const {
  ensureOutputDir,
  fetchJson,
  getAdminCookie,
  getBaseUrl,
  getEnv,
  getInternalSecret,
  getRequiredEnv,
  info,
  loadLocalEnv,
  signStripePayload,
  writeJsonArtifact
} = require('./launch-clearance-utils');

function parseJsonEnv(name) {
  const raw = process.env[name];
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${name} must be valid JSON. ${error instanceof Error ? error.message : String(error)}`);
  }
}

function createBlockedScenario(name, reason, required = true) {
  return {
    name,
    required,
    status: 'blocked',
    passed: false,
    reason,
    results: []
  };
}

async function postJson(url, body, headers = {}) {
  return fetchJson(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  });
}

async function runFinalizeConcurrency(baseUrl) {
  const payload = parseJsonEnv('FAILURE_PROOF_FINALIZE_PAYLOAD');
  if (!payload) {
    return createBlockedScenario('finalize_concurrency', 'FAILURE_PROOF_FINALIZE_PAYLOAD is not configured.');
  }

  const first = await postJson(`${baseUrl}/api/booking/book`, payload);
  const second = await postJson(`${baseUrl}/api/booking/book`, payload);
  return {
    name: 'finalize_concurrency',
    required: true,
    status: first.response.ok && (second.response.ok || second.response.status === 409) ? 'passed' : 'failed',
    passed: first.response.ok && (second.response.ok || second.response.status === 409),
    results: [
      { status: first.response.status, body: first.body },
      { status: second.response.status, body: second.body }
    ]
  };
}

async function runStripeReplay(baseUrl) {
  const webhookSecret = getEnv('FAILURE_PROOF_STRIPE_WEBHOOK_SECRET') || process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return createBlockedScenario('stripe_webhook_replay', 'STRIPE_WEBHOOK_SECRET is not configured.');
  }

  const endpoint = `${baseUrl}${getEnv('FAILURE_PROOF_STRIPE_WEBHOOK_PATH', '/api/webhooks/stripe')}`;
  const transactionId = getEnv('FAILURE_PROOF_STRIPE_TRANSACTION_ID', `failure-proof-txn-${Date.now()}`);
  const timestamp = Math.floor(Date.now() / 1000);
  const event = {
    id: `evt_failure_proof_replay_${Date.now()}`,
    object: 'event',
    api_version: '2024-06-20',
    created: timestamp,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: `pi_failure_proof_${Date.now()}`,
        metadata: { transactionId }
      }
    }
  };
  const rawBody = JSON.stringify(event);
  const stripeSignature = signStripePayload(webhookSecret, timestamp, rawBody);
  const first = await fetchJson(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': stripeSignature
    },
    body: rawBody
  });
  const duplicate = await fetchJson(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': stripeSignature
    },
    body: rawBody
  });

  const passed = first.response.ok && duplicate.response.ok && duplicate.body && duplicate.body.duplicate === true;
  return {
    name: 'stripe_webhook_replay',
    required: true,
    status: passed ? 'passed' : 'failed',
    passed,
    results: [
      { status: first.response.status, body: first.body },
      { status: duplicate.response.status, body: duplicate.body }
    ]
  };
}

async function runStripeOutOfOrder(baseUrl) {
  const webhookSecret = getEnv('FAILURE_PROOF_STRIPE_WEBHOOK_SECRET') || process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return createBlockedScenario('stripe_webhook_out_of_order', 'STRIPE_WEBHOOK_SECRET is not configured.');
  }

  const endpoint = `${baseUrl}${getEnv('FAILURE_PROOF_STRIPE_WEBHOOK_PATH', '/api/webhooks/stripe')}`;
  const transactionId = getEnv('FAILURE_PROOF_STRIPE_OUT_OF_ORDER_TRANSACTION_ID', `failure-proof-out-of-order-${Date.now()}`);
  const paymentIntentId = `pi_failure_proof_order_${Date.now()}`;

  const events = [
    {
      id: `evt_failure_proof_failed_${Date.now()}`,
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: paymentIntentId,
          metadata: { transactionId },
          last_payment_error: { message: 'simulated failure' }
        }
      }
    },
    {
      id: `evt_failure_proof_succeeded_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          metadata: { transactionId }
        }
      }
    }
  ];

  const results = [];
  for (const event of events) {
    const timestamp = Math.floor(Date.now() / 1000);
    const rawBody = JSON.stringify({
      object: 'event',
      api_version: '2024-06-20',
      created: timestamp,
      ...event
    });
    const stripeSignature = signStripePayload(webhookSecret, timestamp, rawBody);
    const response = await fetchJson(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': stripeSignature
      },
      body: rawBody
    });
    results.push({
      eventId: event.id,
      type: event.type,
      status: response.response.status,
      body: response.body
    });
  }

  const passed = results.every((result) => result.status >= 200 && result.status < 300);
  return {
    name: 'stripe_webhook_out_of_order',
    required: true,
    status: passed ? 'passed' : 'failed',
    passed,
    results
  };
}

async function runWorkerReclaimAndSweeps(baseUrl) {
  let secret;
  try {
    secret = getInternalSecret();
  } catch (error) {
    return createBlockedScenario('worker_reclaim_and_sweeps', error instanceof Error ? error.message : String(error));
  }

  const outbox = await postJson(`${baseUrl}/api/internal/jobs/process-outbox`, {}, {
    'x-internal-job-secret': secret
  });
  const sweeps = await postJson(`${baseUrl}/api/internal/jobs/run-recovery-sweeps`, {}, {
    'x-internal-job-secret': secret
  });

  const passed = outbox.response.ok && sweeps.response.ok;
  return {
    name: 'worker_reclaim_and_sweeps',
    required: true,
    status: passed ? 'passed' : 'failed',
    passed,
    results: [
      { status: outbox.response.status, body: outbox.body },
      { status: sweeps.response.status, body: sweeps.body }
    ]
  };
}

async function runAdminReportPressure(baseUrl) {
  let adminCookie;
  try {
    adminCookie = getAdminCookie();
  } catch (error) {
    return createBlockedScenario('admin_report_pressure', error instanceof Error ? error.message : String(error));
  }

  const paths = [
    '/api/admin/reconciliation?days=30&page=1&limit=10',
    '/api/admin/settlement/ledger?days=30&page=1&limit=10',
    '/api/admin/support/operations?days=30&breachHours=24&page=1&limit=10',
    '/api/admin/support/sla?days=30&breachHours=24&page=1&limit=10'
  ];

  const results = [];
  for (const path of paths) {
    const response = await fetchJson(`${baseUrl}${path}`, {
      headers: {
        cookie: adminCookie
      }
    });
    results.push({
      path,
      status: response.response.status,
      source: response.body?.dataFreshness?.source ?? null,
      total: response.body?.pagination?.total ?? null
    });
  }

  const passed = results.every((result) => result.status === 200 && result.source === 'rpc');
  return {
    name: 'admin_report_pressure',
    required: true,
    status: passed ? 'passed' : 'failed',
    passed,
    results
  };
}

async function runOptionalHookScenario(name, setupUrlEnv, restoreUrlEnv) {
  const setupUrl = process.env[setupUrlEnv];
  if (!setupUrl) {
    return createBlockedScenario(name, `${setupUrlEnv} is not configured.`);
  }

  const results = [];
  const setup = await fetchJson(setupUrl, { method: 'POST' });
  results.push({ step: 'setup', url: setupUrl, status: setup.response.status, body: setup.body });

  if (restoreUrlEnv && process.env[restoreUrlEnv]) {
    const restore = await fetchJson(process.env[restoreUrlEnv], { method: 'POST' });
    results.push({ step: 'restore', url: process.env[restoreUrlEnv], status: restore.response.status, body: restore.body });
  }

  const passed = results.every((result) => result.status >= 200 && result.status < 300);
  return {
    name,
    required: true,
    status: passed ? 'passed' : 'failed',
    passed,
    results
  };
}

async function runFailureProof(profile = getEnv('FAILURE_PROOF_PROFILE', 'base')) {
  loadLocalEnv();
  const baseUrl = getBaseUrl();
  const outputDir = ensureOutputDir('failure-proof-results');
  const scenarios = [];

  info(`Running failure-proof profile=${profile} against ${baseUrl}`);

  scenarios.push(await runFinalizeConcurrency(baseUrl));
  scenarios.push(await runStripeReplay(baseUrl));
  scenarios.push(await runStripeOutOfOrder(baseUrl));
  scenarios.push(await runWorkerReclaimAndSweeps(baseUrl));
  scenarios.push(await runAdminReportPressure(baseUrl));

  if (profile === 'launch') {
    scenarios.push(await runOptionalHookScenario(
      'mark_processed_failure_replay',
      'FAILURE_PROOF_MARK_PROCESSED_FAILURE_URL',
      'FAILURE_PROOF_MARK_PROCESSED_FAILURE_RESTORE_URL'
    ));
    scenarios.push(await runOptionalHookScenario(
      'redis_degradation',
      'FAILURE_PROOF_REDIS_DEGRADE_URL',
      'FAILURE_PROOF_REDIS_RESTORE_URL'
    ));
    scenarios.push(await runOptionalHookScenario(
      'db_latency_spike',
      'FAILURE_PROOF_DB_LATENCY_URL',
      'FAILURE_PROOF_DB_LATENCY_RESTORE_URL'
    ));
  }

  const requiredScenarios = scenarios.filter((scenario) => scenario.required !== false);
  const summary = {
    generatedAt: new Date().toISOString(),
    profile,
    baseUrl,
    scenarios,
    passed: requiredScenarios.every((scenario) => scenario.passed === true)
  };

  const outPath = writeJsonArtifact(outputDir, 'failure-proof', summary);
  return {
    passed: summary.passed,
    outPath,
    scenarioCount: scenarios.length,
    summary
  };
}

async function main() {
  const result = await runFailureProof();
  console.log(JSON.stringify({
    passed: result.passed,
    outPath: result.outPath,
    scenarioCount: result.scenarioCount
  }, null, 2));

  if (!result.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  runFailureProof
};
