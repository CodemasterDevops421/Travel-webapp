import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import exec from 'k6/execution';

const baseUrl = __ENV.PERF_BASE_URL || 'http://localhost:3000';
const adminJwt = __ENV.ADMIN_JWT || '';
const periodDays = __ENV.PERF_DAYS || '30';

const reportLatency = new Trend('admin_report_latency_ms', true);
const reportErrors = new Rate('admin_report_errors');

const requestHeaders = {
  Authorization: `Bearer ${adminJwt}`,
  'content-type': 'application/json'
};

export const options = {
  scenarios: {
    reconciliation: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.K6_RATE_RECONCILIATION || 25),
      timeUnit: '1s',
      duration: __ENV.K6_DURATION || '2m',
      preAllocatedVUs: Number(__ENV.K6_VUS_RECONCILIATION || 200),
      tags: { endpoint: 'reconciliation' }
    },
    reconciliation_export: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.K6_RATE_RECON_EXPORT || 10),
      timeUnit: '1s',
      duration: __ENV.K6_DURATION || '2m',
      preAllocatedVUs: Number(__ENV.K6_VUS_RECON_EXPORT || 120),
      tags: { endpoint: 'reconciliation_export' }
    },
    support_operations: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.K6_RATE_SUPPORT_OPS || 20),
      timeUnit: '1s',
      duration: __ENV.K6_DURATION || '2m',
      preAllocatedVUs: Number(__ENV.K6_VUS_SUPPORT_OPS || 160),
      tags: { endpoint: 'support_operations' }
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    admin_report_errors: ['rate<0.01'],
    admin_report_latency_ms: ['p(95)<800', 'p(99)<1500']
  }
};

export default function () {
  const scenarioName = exec.scenario.name;
  let path = `/api/admin/reconciliation?days=${periodDays}&includeResolved=0`;

  if (scenarioName === 'reconciliation_export') {
    path = `/api/admin/reconciliation/export?days=${periodDays}&includeResolved=0`;
  }
  if (scenarioName === 'support_operations') {
    path = `/api/admin/support/operations?days=${periodDays}&breachHours=24`;
  }

  const response = http.get(`${baseUrl}${path}`, { headers: requestHeaders });
  reportLatency.add(response.timings.duration, { endpoint: scenarioName || 'reconciliation' });

  const ok = check(response, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300
  });
  reportErrors.add(!ok, { endpoint: scenarioName || 'reconciliation' });
}
