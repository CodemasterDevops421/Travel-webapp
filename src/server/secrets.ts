import { HttpError } from '@/server/errors';
import { env } from '@/server/env';

function missingSecretError(name: string): HttpError {
  return new HttpError(503, `${name} is not configured`);
}

export function getQuoteSigningSecret(): string {
  if (!env.QUOTE_SIGNING_SECRET) {
    throw missingSecretError('QUOTE_SIGNING_SECRET');
  }
  return env.QUOTE_SIGNING_SECRET;
}

export function getBookingViewTokenSigningSecret(): string {
  const secret = env.BOOKING_VIEW_TOKEN_SECRET ?? env.QUOTE_SIGNING_SECRET;
  if (!secret) {
    throw missingSecretError('BOOKING_VIEW_TOKEN_SECRET');
  }
  return secret;
}
