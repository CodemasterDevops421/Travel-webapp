import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';

function normalizeIp(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

export function getClientIp(request: NextRequest): string {
  const xRealIp = normalizeIp(request.headers.get('x-real-ip'));
  if (xRealIp) {
    return xRealIp;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = normalizeIp(forwarded.split(',')[0]);
    if (first) {
      return first;
    }
  }

  return 'anonymous';
}

export function getCorrelationId(request: NextRequest): string {
  const candidate = normalizeIp(
    request.headers.get('x-request-id')
      ?? request.headers.get('x-correlation-id')
  );

  return candidate ?? randomUUID();
}
