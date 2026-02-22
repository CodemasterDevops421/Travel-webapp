import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { env } from '@/server/env';
import { HttpError } from '@/server/errors';

function secureEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function assertBookingApiAuthorized(request: NextRequest): void {
  const configuredSecret = env.BOOKING_API_AUTH_SECRET;
  if (!configuredSecret) {
    return;
  }

  const presentedSecret = request.headers.get('x-booking-api-key') ?? '';
  if (!secureEquals(presentedSecret, configuredSecret)) {
    throw new HttpError(401, 'Unauthorized booking API request.');
  }
}
