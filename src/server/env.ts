import { z } from 'zod';

const emptyStringToUndefined = <TSchema extends z.ZodTypeAny>(schema: TSchema) =>
  z.preprocess((value) => {
    if (typeof value === 'string' && value.trim() === '') {
      return undefined;
    }
    return value;
  }, schema);

// Base schema with safe defaults for development
const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: emptyStringToUndefined(z.string().url().default('http://localhost:3000')),
  LITEAPI_API_KEY: emptyStringToUndefined(z.string().optional()),
  LITEAPI_BASE_URL: emptyStringToUndefined(z.string().url().default('https://api.liteapi.travel/v3.0')),
  LITEAPI_BOOK_BASE_URL: emptyStringToUndefined(z.string().url().default('https://book.liteapi.travel/v3.0')),
  LITEAPI_DASHBOARD_BASE_URL: emptyStringToUndefined(z.string().url().default('https://da.liteapi.travel')),
  LITEAPI_TIMEOUT_MS: z.coerce.number().int().positive().max(30000).default(8000),
  LITEAPI_WEBHOOK_SECRET: emptyStringToUndefined(z.string().optional()),
  QUOTE_SIGNING_SECRET: emptyStringToUndefined(z.string().min(16).optional()),
  BOOKING_VIEW_TOKEN_SECRET: emptyStringToUndefined(z.string().min(16).optional()),
  BOOKING_VIEW_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().max(3600).default(600),
  DEFAULT_GUEST_NATIONALITY: z.string().length(2).default('US'),
  GOOGLE_PLACES_API_KEY: emptyStringToUndefined(z.string().optional()),
  NEXT_PUBLIC_SUPABASE_URL: emptyStringToUndefined(z.string().url().default('http://localhost:54321')),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: emptyStringToUndefined(z.string().min(1).default('dev-anon-key')),
  SUPABASE_SERVICE_ROLE_KEY: emptyStringToUndefined(z.string().min(1).default('dev-service-key')),
  UPSTASH_REDIS_REST_URL: emptyStringToUndefined(z.string().url().optional()),
  UPSTASH_REDIS_REST_TOKEN: emptyStringToUndefined(z.string().optional()),
  STRICT_PERSISTENCE_MODE: z.coerce.boolean().default(false),
  SENTRY_DSN: emptyStringToUndefined(z.string().optional()),
  OPENAI_API_KEY: emptyStringToUndefined(z.string().optional()),
  OPENAI_MODEL: emptyStringToUndefined(z.string().optional()),
  PRICE_MARKUP_PERCENT: z.coerce.number().min(0).max(40).default(12),
  DEFAULT_CURRENCY: z.string().length(3).default('USD'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info')
});

// Production schema with strict validation
const productionEnvSchema = baseEnvSchema.extend({
  LITEAPI_API_KEY: emptyStringToUndefined(
    z.string({ 
      required_error: 'LITEAPI_API_KEY is required in production. Get it from https://liteapi.travel'
    }).min(1, 'LITEAPI_API_KEY cannot be empty')
  ),
  QUOTE_SIGNING_SECRET: emptyStringToUndefined(
    z.string({ 
      required_error: 'QUOTE_SIGNING_SECRET is required in production for price integrity. Generate with: openssl rand -hex 32'
    }).min(32, 'QUOTE_SIGNING_SECRET must be at least 32 characters for security')
  ),
  SUPABASE_SERVICE_ROLE_KEY: emptyStringToUndefined(
    z.string({ 
      required_error: 'SUPABASE_SERVICE_ROLE_KEY is required in production for database operations'
    }).min(1, 'SUPABASE_SERVICE_ROLE_KEY cannot be empty')
  )
});

// Choose schema based on environment
const isProduction = process.env.NODE_ENV === 'production';
const schema = isProduction ? productionEnvSchema : baseEnvSchema;

export const env = schema.parse(process.env);

// Runtime validation helper for critical operations
export function validateProductionConfig(): void {
  if (!env.LITEAPI_API_KEY) {
    throw new Error('LITEAPI_API_KEY is required. Set it in your environment variables.');
  }
  if (!env.QUOTE_SIGNING_SECRET || env.QUOTE_SIGNING_SECRET.length < 32) {
    throw new Error('QUOTE_SIGNING_SECRET must be at least 32 characters. Generate with: openssl rand -hex 32');
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for database operations.');
  }
}
