import pino from 'pino';
import { env } from '@/server/env';

export type StructuredLogContext = {
  correlation_id?: string;
  route?: string;
  module?: string;
  event?: string;
  user_id?: string;
  admin_user_id?: string;
  supplier?: string;
  [key: string]: unknown;
};

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'travel-webapp' },
  redact: ['req.headers.authorization', 'apiKey', '*.token', '*.email', '*.cardNumber']
});

export const STRUCTURED_EVENT_PREFIXES = [
  'booking.',
  'webhook.',
  'supplier.',
  'persistence.',
  'observability.',
  'readiness.'
] as const;

function toStructuredContext(context: StructuredLogContext): StructuredLogContext {
  const normalized: StructuredLogContext = { ...context };

  if (typeof normalized.correlation_id !== 'string' || normalized.correlation_id.trim().length === 0) {
    const alt = normalized.correlationId;
    if (typeof alt === 'string' && alt.trim().length > 0) {
      normalized.correlation_id = alt;
    }
  }

  if (!normalized.route && !normalized.module) {
    normalized.module = 'unknown';
  }

  return normalized;
}

function isStructuredEventName(event: string): boolean {
  return STRUCTURED_EVENT_PREFIXES.some((prefix) => event.startsWith(prefix));
}

export function withCorrelation(correlationId: string, context?: Record<string, unknown>) {
  return logger.child({ correlation_id: correlationId, correlationId, ...(context ?? {}) });
}

export function logStructuredEvent(
  level: 'error' | 'warn' | 'info' | 'debug',
  event: string,
  context: StructuredLogContext = {},
  message?: string
): void {
  const safeContext = toStructuredContext(context);

  if (!isStructuredEventName(event)) {
    logger.warn(
      {
        event: 'observability.invalid_event_name',
        provided_event: event,
        allowed_prefixes: STRUCTURED_EVENT_PREFIXES,
        ...safeContext
      },
      'Invalid structured event name; expected approved namespace prefix'
    );
    return;
  }

  logger[level]({ event, ...safeContext }, message ?? event);
}
