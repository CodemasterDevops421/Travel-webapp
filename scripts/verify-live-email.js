#!/usr/bin/env node
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
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.BOOKING_FROM_EMAIL;
  const toEmail = process.env.GO_LIVE_TEST_EMAIL;

  if (!resendApiKey) {
    fail('RESEND_API_KEY is missing.');
  }
  if (!fromEmail) {
    fail('BOOKING_FROM_EMAIL is missing.');
  }
  if (!toEmail) {
    fail('GO_LIVE_TEST_EMAIL is missing. Set a real inbox for proof.');
  }

  const subject = `Go-live email proof ${new Date().toISOString()}`;
  const html = `<p>Go-live proof email delivered.</p><p>Timestamp: ${new Date().toISOString()}</p>`;

  info(`Sending proof email from ${fromEmail} to ${toEmail}`);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `go-live-proof-${Date.now()}`
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html
    })
  });

  const bodyText = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    parsed = bodyText;
  }

  if (!response.ok) {
    fail(`Resend API returned ${response.status}. Body: ${JSON.stringify(parsed)}`);
  }

  const messageId = parsed && typeof parsed === 'object' ? parsed.id : undefined;
  info(`Provider accepted email. Message id: ${messageId ?? 'unknown'}`);
  console.log('PASS: Live email delivery request accepted by provider.');
  console.log('NEXT: Confirm inbox delivery and capture screenshot + headers as proof.');
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
