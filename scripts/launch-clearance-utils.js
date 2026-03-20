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
  throw new Error(message);
}

function info(message) {
  console.log(`INFO: ${message}`);
}

function getEnv(name, fallback = null) {
  return process.env[name] || fallback;
}

function getRequiredEnv(name, fallbackNames = []) {
  const candidates = [name, ...fallbackNames];
  for (const candidate of candidates) {
    const value = process.env[candidate];
    if (value) {
      return value;
    }
  }
  fail(`${name} is required.`);
}

function getBaseUrl() {
  const value = getRequiredEnv('LAUNCH_CLEARANCE_BASE_URL', [
    'FAILURE_PROOF_BASE_URL',
    'SMOKE_BASE_URL',
    'NEXT_PUBLIC_APP_URL'
  ]);
  return value.replace(/\/$/, '');
}

function getAdminCookie() {
  return getRequiredEnv('LAUNCH_CLEARANCE_ADMIN_COOKIE', ['SMOKE_ADMIN_COOKIE']);
}

function getInternalSecret() {
  return getRequiredEnv('LAUNCH_CLEARANCE_INTERNAL_SECRET', ['FAILURE_PROOF_INTERNAL_SECRET', 'BOOKING_API_AUTH_SECRET']);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

function ensureOutputDir(dirName) {
  const outputDir = path.join(process.cwd(), 'docs', 'perf', dirName);
  fs.mkdirSync(outputDir, { recursive: true });
  return outputDir;
}

function writeJsonArtifact(outputDir, prefix, payload) {
  const filePath = path.join(outputDir, `${prefix}-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return filePath;
}

function writeMarkdownArtifact(outputDir, prefix, content) {
  const filePath = path.join(outputDir, `${prefix}-${Date.now()}.md`);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function signStripePayload(secret, timestamp, rawBody) {
  const signedPayload = `${timestamp}.${rawBody}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

async function createSupabaseAdminClient() {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

module.exports = {
  createSupabaseAdminClient,
  ensureOutputDir,
  fail,
  fetchJson,
  formatJson,
  getAdminCookie,
  getBaseUrl,
  getEnv,
  getInternalSecret,
  getRequiredEnv,
  info,
  loadLocalEnv,
  signStripePayload,
  writeJsonArtifact,
  writeMarkdownArtifact
};
