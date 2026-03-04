import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/server/supabase/server';
import { assertAdminAuthorized } from '@/server/authz';
import { HttpError } from '@/server/errors';
import { buildReconciliationReport } from '@/server/admin/reconciliation-report';

function parsePeriodDays(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 30;
  }
  const intValue = Math.floor(parsed);
  return Math.max(7, Math.min(180, intValue));
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
    const includeResolved = ['1', 'true', 'yes'].includes(
      (request.nextUrl.searchParams.get('includeResolved') ?? '').trim().toLowerCase()
    );

    const report = await buildReconciliationReport(supabase, {
      periodDays,
      includeResolved,
      maxIssues: 200
    });

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
