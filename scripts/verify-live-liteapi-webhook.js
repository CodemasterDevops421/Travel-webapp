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
  const webhookSecret = process.env.LITEAPI_WEBHOOK_SECRET;

  if (!appUrl) {
    fail('NEXT_PUBLIC_APP_URL is missing. Set it to your deployed base URL.');
  }
  if (!webhookSecret) {
    fail('LITEAPI_WEBHOOK_SECRET is missing.');
  }

  const endpoint = `${appUrl.replace(/\/$/, '')}/api/webhooks/liteapi`;
  const timestampSeconds = Math.floor(Date.now() / 1000);
  const event = {
    id: `liteapi_golive_${Date.now()}`,
    type: 'booking.confirmed',
    status: 'confirmed',
    data: {
      status: 'confirmed'
    }
  };

  const rawBody = JSON.stringify(event);
  const signedPayload = `${timestampSeconds}.${rawBody}`;
  const signature = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');

  info(`Posting signed LiteAPI test event to ${endpoint}`);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-liteapi-timestamp': String(timestampSeconds),
      'x-liteapi-signature': signature
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
    fail(`LiteAPI webhook endpoint returned ${response.status}. Body: ${JSON.stringify(parsed)}`);
  }

  info(`LiteAPI webhook endpoint accepted event (${response.status}). Response: ${JSON.stringify(parsed)}`);
  console.log('PASS: Live LiteAPI webhook signature verification and endpoint acceptance succeeded.');
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
