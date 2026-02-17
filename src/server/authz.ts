import type { NextRequest } from 'next/server';
import { env } from '@/server/env';
import { HttpError } from '@/server/errors';

export function assertBookingApiAuthorized(request: NextRequest): void {
  const configuredSecret = env.BOOKING_API_AUTH_SECRET;
  if (!configuredSecret) {
    return;
  }

  const presentedSecret = request.headers.get('x-booking-api-key') ?? '';
  if (presentedSecret !== configuredSecret) {
    throw new HttpError(401, 'Unauthorized booking API request.');
  }
}
