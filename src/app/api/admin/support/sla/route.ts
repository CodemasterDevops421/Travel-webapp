import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/server/supabase/server';
import { assertAdminAuthorized } from '@/server/authz';
import { HttpError } from '@/server/errors';
import { buildSupportSlaReport } from '@/server/admin/support-sla-report';

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
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await assertAdminAuthorized(supabase, user);

    const periodDays = parsePeriodDays(request.nextUrl.searchParams.get('days'));
    const breachHours = parseBreachHours(request.nextUrl.searchParams.get('breachHours'));

    const report = await buildSupportSlaReport(supabase, {
      periodDays,
      breachHours,
      limit: 200
    });

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
