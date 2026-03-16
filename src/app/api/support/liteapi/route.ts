import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { HttpError, toHttpError } from '@/server/errors';
import { getClientIp } from '@/server/request';
import { assertBookingApiAuthorized } from '@/server/authz';
import { canAccessBooking } from '@/server/booking-access';
import { assertProductionReadiness, env } from '@/server/env';
import { getBookingById, updateBookingStatusById } from '@/server/booking/repository';
import { verifyBookingViewToken } from '@/server/booking-view-token';
import { createServerSupabaseClient } from '@/server/supabase/server';

const requestSchema = z.object({
  bookingId: z.string().trim().min(1),
  notes: z.string().trim().max(500).optional(),
  channel: z.enum(['chat', 'email', 'phone']).default('chat')
});

function readMetadataString(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

async function forwardToSupportBridge(packet: Record<string, unknown>): Promise<{ forwarded: boolean; error?: string }> {
  if (!env.LITEAPI_SUPPORT_FORWARD_URL) {
    if (env.LITEAPI_SUPPORT_AUTO_FORWARD) {
      return { forwarded: false, error: 'LITEAPI_SUPPORT_FORWARD_URL is not configured' };
    }
    return { forwarded: false };
  }

  try {
    const response = await fetch(env.LITEAPI_SUPPORT_FORWARD_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.LITEAPI_SUPPORT_FORWARD_TOKEN
          ? { authorization: `Bearer ${env.LITEAPI_SUPPORT_FORWARD_TOKEN}` }
          : {})
      },
      body: JSON.stringify(packet),
      cache: 'no-store'
    });

    if (!response.ok) {
      return { forwarded: false, error: `Support bridge rejected request (${response.status})` };
    }

    return { forwarded: true };
  } catch (error) {
    return {
      forwarded: false,
      error: error instanceof Error ? error.message : 'Support bridge request failed'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    assertProductionReadiness();
    await assertRateLimit(`support-liteapi:${getClientIp(request)}`);

    const body = requestSchema.parse(await request.json());
    const bookingViewToken = request.headers.get('x-booking-view-token');
    const tokenAuthorized = typeof bookingViewToken === 'string'
      && verifyBookingViewToken({ bookingId: body.bookingId, token: bookingViewToken });
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    let apiAuthorized = false;
    try {
      assertBookingApiAuthorized(request);
      apiAuthorized = true;
    } catch {
      apiAuthorized = false;
    }

    const booking = await getBookingById(body.bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const ownerAuthorized = canAccessBooking(user, booking);
    if (!apiAuthorized && !tokenAuthorized && !ownerAuthorized) {
      throw new HttpError(401, 'Unauthorized booking API request.');
    }

    const supportRequestId = `liteapi-support-${randomUUID()}`;
    const metadata = booking.metadata as Record<string, unknown> | null;
    const supportPacket = {
      provider: 'liteapi',
      supportRequestId,
      preparedAt: new Date().toISOString(),
      bookingId: booking.id,
      liteapiBookingId: booking.liteapi_booking_id,
      bookingStatus: booking.status,
      paymentStatus: booking.payment_status,
      transactionId: readMetadataString(metadata, 'transactionId'),
      prebookId: readMetadataString(metadata, 'prebookId'),
      clientReference: readMetadataString(metadata, 'clientReference'),
      holderEmail: readMetadataString((metadata?.holder as Record<string, unknown> | undefined) ?? null, 'email'),
      requestedChannel: body.channel,
      notes: body.notes ?? null
    };

    const forwardResult = await forwardToSupportBridge(supportPacket);
    if (env.LITEAPI_SUPPORT_AUTO_FORWARD && !forwardResult.forwarded) {
      return NextResponse.json(
        { error: forwardResult.error ?? 'Support handoff bridge unavailable' },
        { status: 502 }
      );
    }

    const persisted = await updateBookingStatusById(booking.id, booking.status, {
      supportHandoff: supportPacket,
      lastSupportRequestId: supportRequestId,
      supportRequestedAt: supportPacket.preparedAt,
      supportForwarded: forwardResult.forwarded,
      ...(forwardResult.error ? { supportForwardError: forwardResult.error } : {})
    });

    if (!persisted) {
      return NextResponse.json({ error: 'Support handoff could not be persisted' }, { status: 409 });
    }

    return NextResponse.json(
      {
        ok: true,
        supportRequestId,
        supportPacket,
        supportForwarded: forwardResult.forwarded,
        instructions: 'Share this support packet with LiteAPI/Nuitee 24/7 support channels.'
      },
      { status: 200 }
    );
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
