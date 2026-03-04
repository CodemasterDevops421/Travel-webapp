import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/server/supabase/server';
import { assertAdminAuthorized } from '@/server/authz';
import { HttpError } from '@/server/errors';
import { invalidateAdminReportCache } from '@/server/admin/report-cache';

const requestSchema = z.object({
  resolutionNote: z.string().trim().min(3).max(500),
  issueType: z.enum(['missing_tracking', 'amount_mismatch', 'currency_mismatch']).optional()
});

type RouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await assertAdminAuthorized(supabase, user);

    const payload = requestSchema.parse(await request.json());
    const { bookingId } = await context.params;
    if (!bookingId?.trim()) {
      return NextResponse.json({ error: 'Invalid booking id' }, { status: 400 });
    }

    const bookingResult = await supabase
      .from('bookings')
      .select('id, metadata')
      .eq('id', bookingId)
      .single();

    if (bookingResult.error || !bookingResult.data) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const metadata = (bookingResult.data.metadata as Record<string, unknown> | null) ?? {};
    const previousReconciliation =
      typeof metadata.reconciliation === 'object' && metadata.reconciliation !== null
        ? (metadata.reconciliation as Record<string, unknown>)
        : {};

    const nextMetadata: Record<string, unknown> = {
      ...metadata,
      reconciliation: {
        ...previousReconciliation,
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolvedBy: user.email ?? user.id,
        resolutionNote: payload.resolutionNote,
        issueType: payload.issueType ?? previousReconciliation.issueType ?? null
      }
    };

    const updateResult = await supabase
      .from('bookings')
      .update({
        metadata: nextMetadata
      })
      .eq('id', bookingId);

    if (updateResult.error) {
      return NextResponse.json({ error: 'Failed to persist resolution state' }, { status: 500 });
    }

    invalidateAdminReportCache([
      `admin:reconciliation:${user.id}:`,
      `admin:reconciliation-export:${user.id}:`,
      `admin:readiness:${user.id}:`
    ]);

    return NextResponse.json({
      ok: true,
      bookingId,
      reconciliation: nextMetadata.reconciliation
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid resolution payload', issues: error.issues }, { status: 400 });
    }
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
