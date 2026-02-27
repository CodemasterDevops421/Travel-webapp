import { env } from '@/server/env';
import { HttpError } from '@/server/errors';

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
}
