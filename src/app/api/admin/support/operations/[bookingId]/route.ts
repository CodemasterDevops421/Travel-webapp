import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/server/supabase/server';
import { assertAdminAuthorized } from '@/server/authz';
import { HttpError } from '@/server/errors';
import { getBookingById, updateBookingStatusById } from '@/server/booking/repository';

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
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await assertAdminAuthorized(supabase, user);

    const { bookingId } = await context.params;
    const payload = requestSchema.parse(await request.json());
    const booking = await getBookingById(bookingId);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const persisted = await updateBookingStatusById(booking.id, booking.status, {
      supportState: payload.state,
      supportPriority: payload.priority ?? (booking.metadata?.supportPriority ?? 'medium'),
      supportAssignedTo: payload.assignedTo ?? null,
      supportResolutionNote: payload.resolutionNote ?? null,
      supportUpdatedAt: nowIso,
      supportResolvedAt:
        payload.state === 'resolved' || payload.state === 'closed'
          ? nowIso
          : null
    });

    if (!persisted) {
      return NextResponse.json({ error: 'Support case update could not be persisted' }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      state: payload.state,
      updatedAt: nowIso
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid support case payload', issues: error.issues }, { status: 400 });
    }
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
