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

export function withCorrelation(correlationId: string, context?: Record<string, unknown>) {
  return logger.child({ correlation_id: correlationId, correlationId, ...(context ?? {}) });
}

export function logStructuredEvent(
  level: 'error' | 'warn' | 'info' | 'debug',
  event: string,
  context: StructuredLogContext = {},
  message?: string
): void {
  logger[level]({ event, ...context }, message ?? event);
}
