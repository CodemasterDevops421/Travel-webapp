import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { cancelBooking } from '@/server/liteapi';
import { toHttpError } from '@/server/errors';
import { getClientIp } from '@/server/request';
import { assertBookingApiAuthorized } from '@/server/authz';
import { assertProductionReadiness } from '@/server/env';
import { createStripeRefund } from '@/server/payments/stripe';
import { getBookingById, updateBookingStatusById } from '@/server/booking/repository';

const paramsSchema = z.object({
  bookingId: z.string().trim().min(1)
});

const bodySchema = z.object({
  reason: z.string().trim().min(1).max(240).optional()
});

export async function POST(request: NextRequest, context: { params: Promise<{ bookingId: string }> }) {
  try {
    assertProductionReadiness();
    assertBookingApiAuthorized(request);

    const params = paramsSchema.parse(await context.params);
    await assertRateLimit(`bookings-cancel-lifecycle:${getClientIp(request)}`);

    const parsedBody = bodySchema.safeParse(await request.json().catch(() => ({})));
    const reason = parsedBody.success ? parsedBody.data.reason ?? null : null;

    const booking = await getBookingById(params.bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'failed' || booking.status === 'refunded') {
      return NextResponse.json(
        { error: `Booking is already ${booking.status}` },
        { status: 409 }
      );
    }

    if (booking.status !== 'payment_authorized' && booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: `Booking cannot be canceled from status ${booking.status}` },
        { status: 409 }
      );
    }

    const requiresRefund = booking.payment_status === 'captured';
    if (requiresRefund && !booking.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: 'Refund is required but payment intent is unavailable' },
        { status: 409 }
      );
    }

    if (booking.liteapi_booking_id) {
      await cancelBooking({ bookingId: booking.liteapi_booking_id });
    }

    let refundId: string | null = null;
    if (requiresRefund && booking.stripe_payment_intent_id) {
      const refund = await createStripeRefund({
        paymentIntentId: booking.stripe_payment_intent_id,
        metadata: {
          bookingId: booking.id,
          cancellationReason: reason ?? 'not_provided'
        }
      });
      refundId = refund.refundId;
    }

    const nextStatus = requiresRefund ? 'refunded' : 'failed';
    const paymentStatus = requiresRefund ? 'refunded' : 'failed';
    const invoiceStatus = requiresRefund ? 'refunded' : 'void';

    const updated = await updateBookingStatusById(booking.id, nextStatus, {
      paymentStatus,
      invoiceStatus,
      cancellationReason: reason,
      cancellationRequestedAt: new Date().toISOString(),
      cancellationOutcome: nextStatus,
      ...(refundId ? { stripeRefundId: refundId } : {})
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Booking cancellation could not be persisted' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        bookingId: booking.id,
        status: nextStatus,
        paymentStatus,
        invoiceStatus,
        refundId
      },
      { status: 200 }
    );
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
