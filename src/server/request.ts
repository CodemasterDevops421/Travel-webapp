import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { HttpError } from '@/server/errors';

function normalizeIp(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

export function getClientIp(request: Pick<Request, 'headers'> | NextRequest): string {
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

export function getCorrelationId(request: Pick<Request, 'headers'> | NextRequest): string {
  const candidate = normalizeIp(
    request.headers.get('x-request-id')
      ?? request.headers.get('x-correlation-id')
  );

  return candidate ?? randomUUID();
}

export function getRequestContext(request: Pick<Request, 'headers'> | NextRequest): { clientIp: string; correlationId: string } {
  return {
    clientIp: getClientIp(request),
    correlationId: getCorrelationId(request)
  };
}

export async function parseRequestBody<TSchema extends z.ZodTypeAny>(
  request: NextRequest,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    throw new HttpError(400, 'Invalid request payload');
  }

  return parsed.data;
}

function sanitizeString(value: string): string {
  return value
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
}

export function sanitizeRecord<T extends Record<string, unknown>>(input: T): T {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      output[key] = sanitizeString(value);
      continue;
    }
    if (Array.isArray(value)) {
      output[key] = value.map((item) => (typeof item === 'string' ? sanitizeString(item) : item));
      continue;
    }
    output[key] = value;
  }
  return output as T;
}
