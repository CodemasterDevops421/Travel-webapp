import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('admin report error-budget readiness alarms', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const { __unsafeResetAdminReportObservabilityForTests } = await import('@/server/admin/report-observability');
    __unsafeResetAdminReportObservabilityForTests();
  });

  it('returns warn check when sample size is insufficient', async () => {
    const { buildReadinessReport } = await import('@/server/ops/readiness');
    const report = await buildReadinessReport();
    const adminCheck = report.checks.find((check) => check.id === 'admin_reports');

    expect(adminCheck?.status).toBe('warn');
    expect(report.alarms.length).toBe(0);
  });

  it('raises critical alarm when admin report error budget is exceeded', async () => {
    const { recordAdminReportObservation } = await import('@/server/admin/report-observability');
    const baseNow = Date.now();

    for (let i = 0; i < 30; i += 1) {
      recordAdminReportObservation(
        'admin_reconciliation_get',
        i < 3 ? 500 : 200,
        300,
        baseNow - 1000
      );
    }

    const { buildReadinessReport } = await import('@/server/ops/readiness');
    const report = await buildReadinessReport();
    const adminCheck = report.checks.find((check) => check.id === 'admin_reports');

    expect(adminCheck?.status).toBe('fail');
    expect(report.alarms.length).toBe(1);
    expect(report.alarms[0].severity).toBe('critical');
  });
});
