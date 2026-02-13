import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/server/env';

type SessionSignaturePayload = {
  prebookId: string;
  transactionId: string;
  clientReference: string;
  quoteId: string | null;
  quoteSignature: string;
};

function createSessionSignature(payload: SessionSignaturePayload): string {
  return createHmac('sha256', env.QUOTE_SIGNING_SECRET).update(JSON.stringify(payload)).digest('hex');
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function signCheckoutSession(payload: SessionSignaturePayload): string {
  return createSessionSignature(payload);
}

export function verifyCheckoutSessionSignature(
  payload: SessionSignaturePayload,
  signature: string
): boolean {
  const expected = createSessionSignature(payload);
  return safeCompare(expected, signature);
}
