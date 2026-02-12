import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  LITEAPI_API_KEY: z.string().min(1).default('liteapi-placeholder-key'),
  LITEAPI_BASE_URL: z.string().url().default('https://api.liteapi.travel/v3.0'),
  LITEAPI_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('https://example.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default('supabase-anon-placeholder'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default('supabase-service-role-placeholder'),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  PRICE_MARKUP_PERCENT: z.coerce.number().min(0).max(40).default(12),
  DEFAULT_CURRENCY: z.string().length(3).default('USD'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info')
});

export const env = envSchema.parse(process.env);
