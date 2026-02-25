import type { NextRequest } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { env } from '@/server/env';

function normalizeHeaderValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

function parseIp(value: string | null | undefined): string | null {
  const normalized = normalizeHeaderValue(value);
  if (!normalized) {
    return null;
  }

  return isIP(normalized) ? normalized : null;
}

function parseForwardedFor(value: string | null | undefined): string | null {
  const normalized = normalizeHeaderValue(value);
  if (!normalized) {
    return null;
  }

  for (const segment of normalized.split(',')) {
    const candidate = parseIp(segment);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function canTrustForwardedHeaders(): boolean {
  if (env.NODE_ENV !== 'production') {
    return true;
  }

  return env.TRUST_PROXY_HEADERS;
}

function buildUntrustedFingerprint(request: NextRequest): string {
  const components = [
    normalizeHeaderValue(request.headers.get('user-agent')),
    normalizeHeaderValue(request.headers.get('accept-language')),
    normalizeHeaderValue(request.headers.get('sec-ch-ua')),
    normalizeHeaderValue(request.headers.get('sec-ch-ua-platform')),
    normalizeHeaderValue(request.headers.get('accept')),
    normalizeHeaderValue(request.headers.get('host'))
  ].filter((value): value is string => value !== null);

  if (components.length === 0) {
    return 'anonymous';
  }

  const digest = createHash('sha256')
    .update(components.join('|'))
    .digest('hex')
    .slice(0, 24);

  return `anon:${digest}`;
}

export function getClientIp(request: NextRequest): string {
  if (!canTrustForwardedHeaders()) {
    return buildUntrustedFingerprint(request);
  }

  const xRealIp = parseIp(request.headers.get('x-real-ip'));
  if (xRealIp) {
    return xRealIp;
  }

  const forwarded = parseForwardedFor(request.headers.get('x-forwarded-for'));
  if (forwarded) {
    return forwarded;
  }

  return 'anonymous';
}

export function getCorrelationId(request: NextRequest): string {
  const candidate = normalizeHeaderValue(
    request.headers.get('x-request-id')
      ?? request.headers.get('x-correlation-id')
  );

  return candidate ?? randomUUID();
}
