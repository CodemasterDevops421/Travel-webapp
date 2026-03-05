import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/server/supabase/server';
import { assertAdminAuthorized } from '@/server/authz';
import { HttpError } from '@/server/errors';
import { getBookingById, updateBookingMetadataById } from '@/server/booking/repository';
import { assertRateLimit, createRateLimitKey } from '@/server/ratelimit';
import { getClientIp } from '@/server/request';
import { invalidateAdminReportCache } from '@/server/admin/report-cache';
import { recordAdminReportObservation } from '@/server/admin/report-observability';

const requestSchema = z.object({
  state: z.enum(['new', 'in_progress', 'awaiting_supplier', 'resolved', 'closed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().trim().min(2).max(80).nullable().optional(),
  resolutionNote: z.string().trim().max(500).nullable().optional()
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
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
      createRateLimitKey('mutation', clientIp, 'admin-support-operations-patch'),
      'mutation'
    );

    await assertAdminAuthorized(supabase, user);

    const { bookingId } = await context.params;
    const payload = requestSchema.parse(await request.json());
    const booking = await getBookingById(bookingId);

    if (!booking) {
      responseStatus = 404;
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const supportMetadata: Record<string, unknown> = {
      supportState: payload.state,
      supportPriority: payload.priority ?? (booking.metadata?.supportPriority ?? 'medium'),
      supportUpdatedAt: nowIso,
      supportResolvedAt:
        payload.state === 'resolved' || payload.state === 'closed'
          ? nowIso
          : null
    };

    if ('assignedTo' in payload) {
      supportMetadata.supportAssignedTo = payload.assignedTo;
    }
    if ('resolutionNote' in payload) {
      supportMetadata.supportResolutionNote = payload.resolutionNote;
    }

    const persisted = await updateBookingMetadataById(booking.id, supportMetadata);

    if (!persisted) {
      responseStatus = 409;
      return NextResponse.json({ error: 'Support case update could not be persisted' }, { status: 409 });
    }

    invalidateAdminReportCache([
      `admin:support-operations:${user.id}:`,
      `admin:readiness:${user.id}:`
    ]);

    responseStatus = 200;
    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      state: payload.state,
      updatedAt: nowIso
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      responseStatus = 400;
      return NextResponse.json({ error: 'Invalid support case payload', issues: error.issues }, { status: 400 });
    }
    if (error instanceof HttpError) {
      responseStatus = error.status;
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    responseStatus = 500;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    recordAdminReportObservation('admin_support_operations_patch', responseStatus, Date.now() - startedAt);
  }
}
