import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/server/supabase/server';
import { assertAdminAuthorized } from '@/server/authz';
import { HttpError } from '@/server/errors';
import { buildReconciliationReport, type ReconciliationIssue } from '@/server/admin/reconciliation-report';
import { assertRateLimit, createRateLimitKey } from '@/server/ratelimit';
import { getClientIp } from '@/server/request';
import { getOrSetAdminReportCache } from '@/server/admin/report-cache';
import { recordAdminReportObservation } from '@/server/admin/report-observability';

const ADMIN_REPORT_CACHE_TTL_SECONDS = 15;

function parsePeriodDays(raw: string | null): number {
  if (raw == null || raw.trim() === '') {
    return 30;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 30;
  }
  const intValue = Math.floor(parsed);
  return Math.max(7, Math.min(180, intValue));
}

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function issueToRow(issue: ReconciliationIssue): string {
  return [
    csvEscape(issue.bookingId),
    csvEscape(issue.type),
    csvEscape(issue.detail),
    csvEscape(issue.createdAt),
    csvEscape(issue.reconciliation.resolved ? 'resolved' : 'open'),
    csvEscape(issue.reconciliation.resolvedAt),
    csvEscape(issue.reconciliation.resolvedBy),
    csvEscape(issue.reconciliation.resolutionNote)
  ].join(',');
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  let responseStatus = 500;
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
      createRateLimitKey('mutation', clientIp, 'admin-reconciliation-export-get'),
      'mutation'
    );

    await assertAdminAuthorized(supabase, user);

    const periodDays = parsePeriodDays(request.nextUrl.searchParams.get('days'));
    const includeResolved = ['1', 'true', 'yes'].includes(
      (request.nextUrl.searchParams.get('includeResolved') ?? '').trim().toLowerCase()
    );

    const cacheKey = `admin:reconciliation-export:${user.id}:${periodDays}:${includeResolved ? '1' : '0'}`;
    const report = await getOrSetAdminReportCache(cacheKey, ADMIN_REPORT_CACHE_TTL_SECONDS, () =>
      buildReconciliationReport(supabase, {
        periodDays,
        includeResolved,
        maxIssues: 2000
      })
    );

    const header = [
      'booking_id',
      'issue_type',
      'detail',
      'created_at',
      'state',
      'resolved_at',
      'resolved_by',
      'resolution_note'
    ].join(',');
    const rows = report.issues.map(issueToRow);
    const csv = [header, ...rows].join('\n');

    const fileDate = new Date().toISOString().slice(0, 10);
    const filename = `reconciliation-issues-${fileDate}.csv`;

    responseStatus = 200;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': `private, max-age=${ADMIN_REPORT_CACHE_TTL_SECONDS}`
      }
    });
  } catch (error) {
    if (error instanceof HttpError) {
      responseStatus = error.status;
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    responseStatus = 500;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    recordAdminReportObservation('admin_reconciliation_export_get', responseStatus, Date.now() - startedAt);
  }
}
