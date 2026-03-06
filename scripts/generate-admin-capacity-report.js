#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const resultsDir = path.join(process.cwd(), 'docs', 'perf', 'admin-load-results');
const outputPath = path.join(process.cwd(), 'docs', 'perf', 'ADMIN_REPORT_CAPACITY_REPORT.md');

function readStageSummary(stage) {
  const file = path.join(resultsDir, `k6-summary-${stage}.json`);
  if (!fs.existsSync(file)) {
    return null;
  }
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const metrics = parsed.metrics || {};
  return {
    stage,
    reqCount: metrics.http_reqs?.values?.count ?? 0,
    errorRate: metrics.http_req_failed?.values?.rate ?? 0,
    p95: metrics.http_req_duration?.values?.['p(95)'] ?? 0,
    p99: metrics.http_req_duration?.values?.['p(99)'] ?? 0
  };
}

function fmt(value, digits = 2) {
  return Number(value || 0).toFixed(digits);
}

function main() {
  const stages = ['100', '500', '1000', '2000'];
  const rows = stages.map(readStageSummary).filter(Boolean);

  if (rows.length === 0) {
    console.error('[capacity-report] no k6 summary files found');
    process.exit(1);
  }

  const lines = [
    '# Admin Report Capacity Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '| Stage | Requests | Error Rate | p95 (ms) | p99 (ms) |',
    '|---|---:|---:|---:|---:|'
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.stage} | ${row.reqCount} | ${fmt(row.errorRate * 100)}% | ${fmt(row.p95, 0)} | ${fmt(row.p99, 0)} |`
    );
  }

  lines.push('');
  lines.push('## Interpretation');
  lines.push('- Safe ceiling must be set at highest stage meeting SLO thresholds.');
  lines.push('- If p95/p99 or error rate exceed target, treat stage as over capacity.');
  lines.push('');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);
  console.log(`[capacity-report] wrote ${outputPath}`);
}

main();
