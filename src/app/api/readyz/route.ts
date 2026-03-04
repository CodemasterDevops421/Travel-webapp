import { NextResponse } from 'next/server';
import { buildReadinessReport } from '@/server/ops/readiness';

export async function GET() {
  const report = await buildReadinessReport();
  return NextResponse.json(report, {
    status: report.ok ? 200 : 503,
    headers: { 'cache-control': 'no-store' }
  });
}
