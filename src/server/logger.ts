import pino from 'pino';
import { env } from '@/server/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: ['req.headers.authorization', 'apiKey', '*.token', '*.email', '*.cardNumber']
});
