#!/usr/bin/env node
const crypto = require('node:crypto');
const {
  fail,
  fetchJson,
  getBaseUrl,
  getRequiredEnv,
  info,
  loadLocalEnv
} = require('./smoke-utils');

function signStripePayload(secret, timestamp, rawBody) {
  const signedPayload = `${timestamp}.${rawBody}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

async function main() {
  loadLocalEnv();
  const baseUrl = getBaseUrl();
  const webhookSecret = getRequiredEnv('STRIPE_WEBHOOK_SECRET');
  const endpoint = `${baseUrl}${process.env.SMOKE_STRIPE_WEBHOOK_PATH || '/api/webhooks/stripe'}`;
  const transactionId = process.env.SMOKE_STRIPE_TRANSACTION_ID || `smoke-txn-${Date.now()}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const event = {
    id: `evt_smoke_${Date.now()}`,
    object: 'event',
    api_version: '2024-06-20',
    created: timestamp,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: `pi_smoke_${Date.now()}`,
        metadata: { transactionId }
      }
    }
  };

  const rawBody = JSON.stringify(event);
  const stripeSignature = signStripePayload(webhookSecret, timestamp, rawBody);

  info(`POST ${endpoint} first delivery`);
  const first = await fetchJson(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': stripeSignature
    },
    body: rawBody
  });

  if (!first.response.ok) {
    fail(`Webhook smoke first delivery failed with ${first.response.status}: ${JSON.stringify(first.body)}`);
  }

  info(`POST ${endpoint} duplicate delivery`);
  const duplicate = await fetchJson(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': stripeSignature
    },
    body: rawBody
  });

  if (!duplicate.response.ok) {
    fail(`Webhook smoke duplicate delivery failed with ${duplicate.response.status}: ${JSON.stringify(duplicate.body)}`);
  }

  if (!duplicate.body || duplicate.body.duplicate !== true) {
    fail(`Webhook smoke duplicate delivery did not report idempotent duplicate handling: ${JSON.stringify(duplicate.body)}`);
  }

  console.log('PASS: Webhook smoke succeeded.');
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
