#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = process.env.PERF_BASE_URL || 'http://localhost:3000';
const CONCURRENCY = Number(process.env.PERF_CONCURRENCY || 8);
const ITERATIONS = Number(process.env.PERF_ITERATIONS || 40);
const WARMUP = Number(process.env.PERF_WARMUP || 5);

const scenarios = [
  {
    name: 'autocomplete',
    path: '/api/autocomplete?q=dubai&language=en'
  },
  {
    name: 'property-preview',
    path: '/api/property-preview?q=dubai&mode=destination&language=en&currency=USD&checkin=2026-04-10&checkout=2026-04-12&adults=2&rooms=1'
  },
  {
    name: 'hotels-rates',
    path: '/api/hotels/rates?hotelId=liteapi-demo-hotel-id&checkin=2026-04-10&checkout=2026-04-12&adults=2&rooms=1&currency=USD'
  }
];

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

async function runOne(url) {
  const startedAt = performance.now();
  const response = await fetch(url, { method: 'GET', cache: 'no-store' });
  const elapsedMs = Math.round(performance.now() - startedAt);
  return { status: response.status, elapsedMs };
}

async function runScenario(scenario) {
  const url = `${BASE_URL}${scenario.path}`;
  const timings = [];
  const statuses = {};

  for (let i = 0; i < WARMUP; i += 1) {
    await runOne(url);
  }

  let executed = 0;
  while (executed < ITERATIONS) {
    const batchSize = Math.min(CONCURRENCY, ITERATIONS - executed);
    const batch = [];
    for (let i = 0; i < batchSize; i += 1) {
      batch.push(runOne(url));
    }
    const results = await Promise.all(batch);
    for (const result of results) {
      timings.push(result.elapsedMs);
      statuses[result.status] = (statuses[result.status] || 0) + 1;
    }
    executed += batchSize;
  }

  return {
    scenario: scenario.name,
    requests: timings.length,
    p50Ms: percentile(timings, 50),
    p95Ms: percentile(timings, 95),
    p99Ms: percentile(timings, 99),
    maxMs: Math.max(...timings),
    minMs: Math.min(...timings),
    statusCounts: statuses
  };
}

function ensureDirectory(target) {
  fs.mkdirSync(target, { recursive: true });
}

function toMarkdown(summary) {
  const lines = [
    '# Performance Proof Baseline',
    '',
    `Generated at: ${summary.generatedAt}`,
    '',
    `Base URL: \`${summary.baseUrl}\``,
    `Concurrency: \`${summary.concurrency}\``,
    `Iterations per scenario: \`${summary.iterations}\``,
    '',
    '| Scenario | Requests | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) |',
    '|---|---:|---:|---:|---:|---:|'
  ];

  for (const result of summary.results) {
    lines.push(
      `| ${result.scenario} | ${result.requests} | ${result.p50Ms} | ${result.p95Ms} | ${result.p99Ms} | ${result.maxMs} |`
    );
  }

  lines.push('', 'Status counts by scenario:', '');
  for (const result of summary.results) {
    lines.push(`- ${result.scenario}: ${JSON.stringify(result.statusCounts)}`);
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const results = [];
  for (const scenario of scenarios) {
    try {
      const output = await runScenario(scenario);
      results.push(output);
      console.log(`[perf-proof] ${scenario.name}: p95=${output.p95Ms}ms p99=${output.p99Ms}ms`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown failure';
      console.error(`[perf-proof] ${scenario.name} failed: ${message}`);
      process.exitCode = 1;
      return;
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    concurrency: CONCURRENCY,
    iterations: ITERATIONS,
    warmup: WARMUP,
    results
  };

  const outputDir = path.join(process.cwd(), 'docs', 'perf');
  ensureDirectory(outputDir);

  fs.writeFileSync(path.join(outputDir, 'baseline-latest.json'), `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'PERFORMANCE_PROOF.md'), `${toMarkdown(summary)}\n`);

  console.log('[perf-proof] wrote docs/perf/baseline-latest.json');
  console.log('[perf-proof] wrote docs/perf/PERFORMANCE_PROOF.md');
}

main();
