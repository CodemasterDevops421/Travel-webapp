import { NextResponse } from 'next/server';
import { buildReadinessReport } from '@/server/ops/readiness';

export async function GET() {
  const report = await buildReadinessReport();
  const hasCriticalAlarm = report.alarms.some((alarm) => alarm.severity === 'critical');
  const hasWarnAlarm = report.alarms.some((alarm) => alarm.severity === 'warn');
  return NextResponse.json(report, {
    status: report.ok ? 200 : 503,
    headers: {
      'cache-control': 'no-store',
      'x-alert-state': hasCriticalAlarm ? 'critical' : hasWarnAlarm ? 'warn' : 'ok'
    }
  });
}
