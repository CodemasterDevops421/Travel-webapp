import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/server/supabase/server';
import { assertAdminAuthorized } from '@/server/authz';
import { HttpError } from '@/server/errors';
import { buildSupportSlaReport } from '@/server/admin/support-sla-report';
import { assertRateLimit, createRateLimitKey } from '@/server/ratelimit';
import { getClientIp } from '@/server/request';
import { getOrSetAdminReportCache } from '@/server/admin/report-cache';
import { recordAdminReportObservation } from '@/server/admin/report-observability';

const ADMIN_REPORT_CACHE_TTL_SECONDS = 10;

function parsePeriodDays(raw: string | null): number {
  if (raw == null || raw.trim() === '') {
    return 30;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 30;
  }
  return Math.max(7, Math.min(180, Math.floor(parsed)));
}

function parseBreachHours(raw: string | null): number {
  if (raw == null || raw.trim() === '') {
    return 24;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 24;
  }
  return Math.max(1, Math.min(168, Math.floor(parsed)));
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
      createRateLimitKey('mutation', clientIp, 'admin-support-sla-get'),
      'mutation'
    );

    await assertAdminAuthorized(supabase, user);

    const periodDays = parsePeriodDays(request.nextUrl.searchParams.get('days'));
    const breachHours = parseBreachHours(request.nextUrl.searchParams.get('breachHours'));
    const cacheKey = `admin:support-sla:${user.id}:${periodDays}:${breachHours}`;

    const report = await getOrSetAdminReportCache(cacheKey, ADMIN_REPORT_CACHE_TTL_SECONDS, () =>
      buildSupportSlaReport(supabase, {
        periodDays,
        breachHours,
        limit: 200
      })
    );

    responseStatus = 200;
    return NextResponse.json(report, {
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
    recordAdminReportObservation('admin_support_sla_get', responseStatus, Date.now() - startedAt);
  }
}
