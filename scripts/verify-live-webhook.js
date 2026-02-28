#!/usr/bin/env node
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function info(message) {
  console.log(`INFO: ${message}`);
}

async function main() {
  loadLocalEnv();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!appUrl) {
    fail('NEXT_PUBLIC_APP_URL is missing. Set it to your deployed base URL.');
  }

  if (!webhookSecret) {
    fail('STRIPE_WEBHOOK_SECRET is missing.');
  }

  const endpoint = `${appUrl.replace(/\/$/, '')}/api/webhooks/stripe`;
  const timestamp = Math.floor(Date.now() / 1000);
  const event = {
    id: `evt_golive_${Date.now()}`,
    object: 'event',
    api_version: '2024-06-20',
    created: timestamp,
    type: 'charge.pending',
    data: {
      object: {
        id: `ch_golive_${Date.now()}`,
        object: 'charge'
      }
    },
    livemode: true,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null
    }
  };

  const rawBody = JSON.stringify(event);
  const signedPayload = `${timestamp}.${rawBody}`;
  const signature = crypto.createHmac('sha256', webhookSecret).update(signedPayload, 'utf8').digest('hex');
  const stripeSignature = `t=${timestamp},v1=${signature}`;

  info(`Posting signed test event to ${endpoint}`);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': stripeSignature
    },
    body: rawBody
  });

  const bodyText = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    parsed = bodyText;
  }

  if (!response.ok) {
    fail(`Webhook endpoint returned ${response.status}. Body: ${JSON.stringify(parsed)}`);
  }

  info(`Webhook endpoint accepted event (${response.status}). Response: ${JSON.stringify(parsed)}`);
  console.log('PASS: Live Stripe webhook signature verification and endpoint acceptance succeeded.');
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
