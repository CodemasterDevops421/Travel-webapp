import { env } from '@/server/env';
import { HttpError } from '@/server/errors';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

function normalizeOrigin(value: string): string {
  return value.trim().toLowerCase();
}

function toOrigin(urlValue: string): string | null {
  try {
    return normalizeOrigin(new URL(urlValue).origin);
  } catch {
    return null;
  }
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) {
      return rawValue.join('=').trim() || null;
    }
  }

  return null;
}

function requiresCsrfToken(request: Request): boolean {
  const method = request.method.toUpperCase();
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

export function assertSameOrigin(request: Request): void {
  if (env.NODE_ENV === 'test') {
    return;
  }

  const originHeader = request.headers.get('origin');
  if (!originHeader) {
    throw new HttpError(403, 'Origin header is required');
  }

  const requestOrigin = toOrigin(request.url);
  const callerOrigin = toOrigin(originHeader);
  const appOrigin = toOrigin(env.NEXT_PUBLIC_APP_URL);

  if (!requestOrigin || !callerOrigin) {
    throw new HttpError(403, 'Invalid request origin');
  }

  const allowed = new Set<string>([requestOrigin]);
  if (appOrigin) {
    allowed.add(appOrigin);
  }

  if (!allowed.has(callerOrigin)) {
    throw new HttpError(403, 'Cross-site request blocked');
  }

  if (!requiresCsrfToken(request)) {
    return;
  }

  const cookieToken = readCookie(request.headers.get('cookie'), CSRF_COOKIE_NAME);
  const headerToken = request.headers.get(CSRF_HEADER_NAME)?.trim() ?? '';

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new HttpError(403, 'Invalid CSRF token');
  }
}

export function getCsrfCookieName(): string {
  return CSRF_COOKIE_NAME;
}

export function getCsrfHeaderName(): string {
  return CSRF_HEADER_NAME;
}
