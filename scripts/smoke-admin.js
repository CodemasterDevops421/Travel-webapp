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
  const adminCookie = getRequiredEnv('SMOKE_ADMIN_COOKIE');
  const routePath = process.env.SMOKE_ADMIN_ROUTE_PATH || '/api/admin/reconciliation?days=30&page=1&limit=5';

  info(`GET ${routePath}`);
  const result = await fetchJson(`${baseUrl}${routePath}`, {
    headers: {
      cookie: adminCookie
    }
  });

  if (!result.response.ok) {
    fail(`Admin smoke failed with ${result.response.status}: ${JSON.stringify(result.body)}`);
  }

  if (!result.body || !result.body.pagination || !result.body.dataFreshness) {
    fail(`Admin smoke response missing pagination/dataFreshness contract: ${JSON.stringify(result.body)}`);
  }

  console.log('PASS: Admin smoke succeeded.');
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
