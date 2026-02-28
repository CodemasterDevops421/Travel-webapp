import { ZodError } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/server/logger';

type ErrorCaptureContext = {
  correlationId?: string;
  route?: string;
  module?: string;
  event?: string;
  userId?: string;
  adminUserId?: string;
  supplier?: string;
  metadata?: Record<string, unknown>;
};

const SENSITIVE_KEY_PATTERN = /(token|secret|authorization|api[_-]?key|password|cookie|set-cookie)/i;

function redactSensitive(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((value) => redactSensitive(value));
  }

  if (!input || typeof input !== 'object') {
    return input;
  }

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      output[key] = '[REDACTED]';
      continue;
    }
    output[key] = redactSensitive(value);
  }

  return output;
}

export class HttpError extends Error {
  status: number;
  code: string;
  safeMessage: string;
  internalDetails?: Record<string, unknown>;

  constructor(status: number, message: string, options?: { code?: string; safeMessage?: string; internalDetails?: Record<string, unknown> }) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = options?.code ?? `HTTP_${status}`;
    this.safeMessage = options?.safeMessage ?? message;
    this.internalDetails = options?.internalDetails;
  }
}

export class RateLimitError extends HttpError {
  constructor(message = 'Too many requests') {
    super(429, message, { code: 'RATE_LIMIT_EXCEEDED', safeMessage: message });
    this.name = 'RateLimitError';
  }
}

export function captureServerError(error: unknown, context: ErrorCaptureContext = {}): void {
  const routeOrModule = context.route ?? context.module ?? 'unknown';
  const event = context.event ?? 'server_error';
  const metadata = redactSensitive(context.metadata ?? {}) as Record<string, unknown>;
  const err = error instanceof Error ? error : new Error('Non-error exception');

  const payload = {
    event,
    correlation_id: context.correlationId,
    route: context.route,
    module: context.module,
    user_id: context.userId,
    admin_user_id: context.adminUserId,
    supplier: context.supplier,
    error_name: err.name,
    error_message: err.message,
    ...metadata
  };

  if (typeof Sentry.captureException === 'function') {
    try {
      Sentry.captureException(err, {
        tags: {
          event,
          route: context.route,
          module: context.module,
          supplier: context.supplier
        },
        extra: {
          correlation_id: context.correlationId,
          user_id: context.userId,
          admin_user_id: context.adminUserId,
          metadata
        }
      });
    } catch {
      // Never let observability transport failures change API behavior.
    }
  }

  if (typeof logger.error === 'function') {
    logger.error(
      payload,
      `Captured server error in ${routeOrModule}`
    );
    return;
  }

  if (typeof logger.warn === 'function') {
    logger.warn(
      payload,
      `Captured server error in ${routeOrModule}`
    );
    return;
  }

  if (typeof logger.info === 'function') {
    logger.info(
      payload,
      `Captured server error in ${routeOrModule}`
    );
    return;
  }

  if (typeof console.error === 'function') {
    console.error({
      correlation_id: context.correlationId,
      route: context.route,
      module: context.module,
      user_id: context.userId,
      admin_user_id: context.adminUserId,
      supplier: context.supplier,
      error_name: err.name,
      error_message: err.message,
      ...metadata
    });
  }

}

export function toHttpError(error: unknown, context: ErrorCaptureContext = {}): HttpError {
  if (error instanceof HttpError) {
    captureServerError(error, {
      ...context,
      metadata: {
        ...(context.metadata ?? {}),
        http_status: error.status,
        code: error.code,
        safe_message: error.safeMessage,
        internal_details: error.internalDetails ?? null
      }
    });
    return error;
  }

  if (error instanceof ZodError) {
    const mapped = new HttpError(400, 'Invalid request payload', {
      code: 'VALIDATION_ERROR',
      safeMessage: 'Invalid request payload',
      internalDetails: { issues: error.issues }
    });
    captureServerError(mapped, {
      ...context,
      metadata: {
        ...(context.metadata ?? {}),
        issue_count: error.issues.length
      }
    });
    return mapped;
  }

  if (error instanceof SyntaxError) {
    const mapped = new HttpError(400, 'Malformed JSON payload', {
      code: 'MALFORMED_JSON',
      safeMessage: 'Malformed JSON payload'
    });
    captureServerError(mapped, context);
    return mapped;
  }

  const mapped = new HttpError(500, 'Internal server error', {
    code: 'UNHANDLED_EXCEPTION',
    safeMessage: 'Internal server error',
    internalDetails: error instanceof Error ? { name: error.name, message: error.message } : undefined
  });
  captureServerError(error, {
    ...context,
    metadata: {
      ...(context.metadata ?? {}),
      mapped_code: mapped.code,
      mapped_status: mapped.status
    }
  });
  return mapped;
}
