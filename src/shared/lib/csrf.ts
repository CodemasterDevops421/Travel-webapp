'use client';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }

  return null;
}

export function getCsrfToken(): string | null {
  return readCookie(CSRF_COOKIE_NAME);
}

export function withCsrfHeaders(headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  const token = getCsrfToken();
  if (token) {
    result.set(CSRF_HEADER_NAME, token);
  }
  return result;
}
