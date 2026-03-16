import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertSameOrigin } from '@/server/csrf';
import { toHttpError } from '@/server/errors';
import { verifyCheckoutSessionSignature } from '@/server/booking-session';
import { saveCheckoutProgressSession } from '@/server/booking-store';
import { parseRequestBody } from '@/server/request';
import { createServerSupabaseClient } from '@/server/supabase/server';

const requestSchema = z.object({
  prebookId: z.string().trim().min(1),
  transactionId: z.string().trim().min(1),
  clientReference: z.string().trim().min(1),
  quoteId: z.string().trim().min(1).nullable(),
  sessionSignature: z.string().trim().min(32),
  quoteSignature: z.string().trim().min(32),
  holder: z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    email: z.string().trim().email()
  }),
  guests: z.array(
    z.object({
      occupancyNumber: z.number().int().positive(),
      firstName: z.string().trim().min(1),
      lastName: z.string().trim().min(1)
    })
  ).min(1),
  quote: z.object({
    hotelId: z.string().trim().min(1),
    roomId: z.string().trim().min(1),
    baseAmount: z.number().nonnegative(),
    totalAmount: z.number().nonnegative(),
    currency: z.string().trim().length(3),
    signature: z.string().trim().min(32)
  })
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);

    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required to continue booking.', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const payload = await parseRequestBody(request, requestSchema);
    const verified = verifyCheckoutSessionSignature(
      {
        prebookId: payload.prebookId,
        transactionId: payload.transactionId,
        clientReference: payload.clientReference,
        quoteId: payload.quoteId,
        quoteSignature: payload.quoteSignature
      },
      payload.sessionSignature
    );

    if (!verified) {
      return NextResponse.json({ error: 'Invalid checkout session signature.' }, { status: 401 });
    }

    await saveCheckoutProgressSession({
      transactionId: payload.transactionId,
      prebookId: payload.prebookId,
      clientReference: payload.clientReference,
      quoteId: payload.quoteId,
      sessionSignature: payload.sessionSignature,
      quoteSignature: payload.quoteSignature,
      holderEmail: payload.holder.email,
      holder: payload.holder,
      guests: payload.guests,
      quote: payload.quote,
      state: 'awaiting_confirmation',
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const httpError = toHttpError(error, {
      route: 'booking-checkout-progress',
      module: 'booking.checkout_progress'
    });
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
