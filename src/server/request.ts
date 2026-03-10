import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { HttpError } from '@/server/errors';
import { env } from '@/server/env';

function normalizeIp(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

export function getClientIp(request: Pick<Request, 'headers'> | NextRequest): string {
  const vercelIp = normalizeIp(request.headers.get('x-vercel-ip'));
  if (vercelIp) {
    return vercelIp;
  }

  const cloudflareIp = normalizeIp(request.headers.get('cf-connecting-ip'));
  if (cloudflareIp) {
    return cloudflareIp;
  }

  if (!env.TRUST_X_FORWARDED_FOR) {
    return 'anonymous';
  }

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

export function sanitizeUnknown<T>(input: T): T {
  if (typeof input === 'string') {
    return sanitizeString(input) as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeUnknown(item)) as T;
  }

  if (!input || typeof input !== 'object') {
    return input;
  }

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    output[key] = sanitizeUnknown(value);
  }
  return output as T;
}

export function sanitizeRecord<T extends Record<string, unknown>>(input: T): T {
  return sanitizeUnknown(input);
}

const SUPPLIER_SECRET_KEY_PATTERN = /(api[_-]?key|secret)/i;

export function stripSupplierSecrets<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => stripSupplierSecrets(item)) as T;
  }

  if (!input || typeof input !== 'object') {
    return input;
  }

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SUPPLIER_SECRET_KEY_PATTERN.test(key)) {
      continue;
    }

    output[key] = stripSupplierSecrets(value);
  }

  return output as T;
}
