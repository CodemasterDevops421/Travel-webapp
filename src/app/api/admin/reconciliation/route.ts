import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/server/supabase/server';
import { assertAdminAuthorized } from '@/server/authz';
import { HttpError } from '@/server/errors';
import { buildReconciliationReport } from '@/server/admin/reconciliation-report';
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

function parsePage(raw: string | null): number {
  if (raw == null || raw.trim() === '') {
    return 1;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.max(1, Math.min(100, Math.floor(parsed)));
}

function parseLimit(raw: string | null): number {
  if (raw == null || raw.trim() === '') {
    return 50;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 50;
  }
  return Math.max(1, Math.min(100, Math.floor(parsed)));
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
      createRateLimitKey('mutation', clientIp, 'admin-reconciliation-get'),
      'mutation'
    );

    await assertAdminAuthorized(supabase, user);

    const periodDays = parsePeriodDays(request.nextUrl.searchParams.get('days'));
    const page = parsePage(request.nextUrl.searchParams.get('page'));
    const limit = parseLimit(request.nextUrl.searchParams.get('limit'));
    const includeResolved = ['1', 'true', 'yes'].includes(
      (request.nextUrl.searchParams.get('includeResolved') ?? '').trim().toLowerCase()
    );

    const cacheKey = `admin:reconciliation:${user.id}:${periodDays}:${includeResolved ? '1' : '0'}`;
    const report = await getOrSetAdminReportCache(cacheKey, ADMIN_REPORT_CACHE_TTL_SECONDS, () =>
      buildReconciliationReport(supabase, {
        periodDays,
        includeResolved,
        maxIssues: 500
      })
    );

    const start = (page - 1) * limit;

    responseStatus = 200;
    return NextResponse.json({
      ...report,
      issues: report.issues.slice(start, start + limit),
      pagination: {
        page,
        limit,
        total: report.issues.length,
        totalPages: Math.max(1, Math.ceil(report.issues.length / limit))
      }
    }, {
      headers: {
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
    recordAdminReportObservation('admin_reconciliation_get', responseStatus, Date.now() - startedAt);
  }
}
