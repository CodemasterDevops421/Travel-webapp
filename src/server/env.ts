import { z } from 'zod';

const emptyStringToUndefined = <TSchema extends z.ZodTypeAny>(schema: TSchema) =>
  z.preprocess((value) => {
    if (typeof value === 'string' && value.trim() === '') {
      return undefined;
    }
    return value;
  }, schema);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: emptyStringToUndefined(z.string().url().default('http://localhost:3000')),
  LITEAPI_API_KEY: emptyStringToUndefined(z.string().min(1).default('liteapi-placeholder-key')),
  LITEAPI_BASE_URL: emptyStringToUndefined(z.string().url().default('https://api.liteapi.travel/v3.0')),
  LITEAPI_BOOK_BASE_URL: emptyStringToUndefined(z.string().url().default('https://book.liteapi.travel/v3.0')),
  LITEAPI_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  LITEAPI_WEBHOOK_SECRET: emptyStringToUndefined(z.string().optional()),
  QUOTE_SIGNING_SECRET: emptyStringToUndefined(z.string().min(16).optional()),
  BOOKING_VIEW_TOKEN_SECRET: emptyStringToUndefined(z.string().min(16).optional()),
  BOOKING_VIEW_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().max(3600).default(600),
  DEFAULT_GUEST_NATIONALITY: z.string().length(2).default('US'),
  GOOGLE_PLACES_API_KEY: emptyStringToUndefined(z.string().optional()),
  NEXT_PUBLIC_SUPABASE_URL: emptyStringToUndefined(z.string().url().default('https://example.supabase.co')),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: emptyStringToUndefined(z.string().min(1).default('supabase-anon-placeholder')),
  SUPABASE_SERVICE_ROLE_KEY: emptyStringToUndefined(z.string().min(1).default('supabase-service-role-placeholder')),
  UPSTASH_REDIS_REST_URL: emptyStringToUndefined(z.string().url().optional()),
  UPSTASH_REDIS_REST_TOKEN: emptyStringToUndefined(z.string().optional()),
  SENTRY_DSN: emptyStringToUndefined(z.string().optional()),
  PRICE_MARKUP_PERCENT: z.coerce.number().min(0).max(40).default(12),
  DEFAULT_CURRENCY: z.string().length(3).default('USD'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info')
});

export const env = envSchema.parse(process.env);
