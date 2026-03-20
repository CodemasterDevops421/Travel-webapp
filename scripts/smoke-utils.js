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

function getBaseUrl() {
  const baseUrl = process.env.SMOKE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    fail('SMOKE_BASE_URL or NEXT_PUBLIC_APP_URL must be set.');
  }
  return baseUrl.replace(/\/$/, '');
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    fail(`${name} is required.`);
  }
  return value;
}

function parseJsonEnv(name, fallback = undefined) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`${name} must be valid JSON. ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return {
    response,
    body: json
  };
}

module.exports = {
  fail,
  fetchJson,
  getBaseUrl,
  getRequiredEnv,
  info,
  loadLocalEnv,
  parseJsonEnv
};
