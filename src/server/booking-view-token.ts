import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/server/env';
import { getBookingViewTokenSigningSecret } from '@/server/secrets';

const BOOKING_VIEW_TOKEN_VERSION = 1;

type BookingViewTokenPayload = {
  v: number;
  bookingId: string;
  iat: number;
  exp: number;
};

type SignBookingViewTokenInput = {
  bookingId: string;
  ttlSeconds?: number;
  nowMs?: number;
};

type VerifyBookingViewTokenInput = {
  bookingId: string;
  token: string;
  nowMs?: number;
};

function signingSecret(): string {
  return getBookingViewTokenSigningSecret();
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

function signPayload(payloadBase64Url: string): string {
  return createHmac('sha256', signingSecret()).update(payloadBase64Url).digest('base64url');
}

export function signBookingViewToken(input: SignBookingViewTokenInput): string {
  const nowMs = input.nowMs ?? Date.now();
  const iat = Math.floor(nowMs / 1000);
  const ttlSeconds = input.ttlSeconds ?? env.BOOKING_VIEW_TOKEN_TTL_SECONDS;
  const payload: BookingViewTokenPayload = {
    v: BOOKING_VIEW_TOKEN_VERSION,
    bookingId: input.bookingId,
    iat,
    exp: iat + ttlSeconds
  };

  const payloadBase64Url = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadBase64Url);
  return `${payloadBase64Url}.${signature}`;
}

export function verifyBookingViewToken(input: VerifyBookingViewTokenInput): boolean {
  const { token, bookingId } = input;
  const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000);
  const [payloadBase64Url, signature] = token.split('.');
  if (!payloadBase64Url || !signature) {
    return false;
  }

  const expectedSignature = signPayload(payloadBase64Url);
  if (!safeCompare(expectedSignature, signature)) {
    return false;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payloadBase64Url)) as BookingViewTokenPayload;
    if (parsed.v !== BOOKING_VIEW_TOKEN_VERSION) {
      return false;
    }
    if (parsed.bookingId !== bookingId) {
      return false;
    }
    if (!Number.isInteger(parsed.exp) || parsed.exp <= nowSeconds) {
      return false;
    }
    if (!Number.isInteger(parsed.iat) || parsed.iat > nowSeconds) {
      return false;
    }
    if (parsed.exp <= parsed.iat) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}
