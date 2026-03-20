import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/server/supabase/server';
import { assertAdminAuthorized } from '@/server/authz';
import { HttpError } from '@/server/errors';
import { buildSettlementLedgerReport } from '@/server/admin/settlement-ledger-report';
import { assertRateLimit, createRateLimitKey } from '@/server/ratelimit';
import { getClientIp } from '@/server/request';
import { recordAdminReportObservation } from '@/server/admin/report-observability';

function parsePeriodDays(raw: string | null): number {
  if (raw == null || raw.trim() === '') return 30;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(7, Math.min(180, Math.floor(parsed)));
}

function parsePage(raw: string | null): number {
  if (raw == null || raw.trim() === '') return 1;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
}

function parseLimit(raw: string | null): number {
  if (raw == null || raw.trim() === '') return 50;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  let responseStatus = 500;
  let reportMeta: { scannedRows?: number; totalRows?: number } | undefined;
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      responseStatus = 401;
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientIp = getClientIp(request);
    await assertRateLimit(
      createRateLimitKey('mutation', clientIp, 'admin-settlement-ledger-get'),
      'mutation'
    );

    await assertAdminAuthorized(supabase, user);

    const page = parsePage(request.nextUrl.searchParams.get('page'));
    const limit = parseLimit(request.nextUrl.searchParams.get('limit'));

    const report = await buildSettlementLedgerReport(supabase, {
      periodDays: parsePeriodDays(request.nextUrl.searchParams.get('days')),
      page,
      limit
    });
    reportMeta = {
      scannedRows: report.processing?.scannedRows,
      totalRows: report.pagination?.total
    };
    responseStatus = 200;
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof HttpError) {
      responseStatus = error.status;
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    responseStatus = 500;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    recordAdminReportObservation('admin_settlement_ledger_get', responseStatus, Date.now() - startedAt, reportMeta);
  }
}
