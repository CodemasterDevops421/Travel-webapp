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
  LITEAPI_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  NEXT_PUBLIC_APP_URL: emptyStringToUndefined(z.string().url().default('http://localhost:3000')),
  LITEAPI_API_KEY: emptyStringToUndefined(z.string().min(1).default('liteapi-placeholder-key')),
  LITEAPI_SANDBOX_API_KEY: emptyStringToUndefined(z.string().optional()),
  LITEAPI_PRODUCTION_API_KEY: emptyStringToUndefined(z.string().optional()),
  LITEAPI_BASE_URL: emptyStringToUndefined(z.string().url().default('https://api.liteapi.travel/v3.0')),
  LITEAPI_SANDBOX_BASE_URL: emptyStringToUndefined(z.string().url().optional()),
  LITEAPI_PRODUCTION_BASE_URL: emptyStringToUndefined(z.string().url().optional()),
  LITEAPI_BOOK_BASE_URL: emptyStringToUndefined(z.string().url().default('https://book.liteapi.travel/v3.0')),
  LITEAPI_SANDBOX_BOOK_BASE_URL: emptyStringToUndefined(z.string().url().optional()),
  LITEAPI_PRODUCTION_BOOK_BASE_URL: emptyStringToUndefined(z.string().url().optional()),
  LITEAPI_DASHBOARD_BASE_URL: emptyStringToUndefined(z.string().url().default('https://da.liteapi.travel')),
  LITEAPI_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  LITEAPI_WEBHOOK_SECRET: emptyStringToUndefined(z.string().optional()),
  QUOTE_SIGNING_SECRET: emptyStringToUndefined(z.string().min(16).optional()),
  BOOKING_VIEW_TOKEN_SECRET: emptyStringToUndefined(z.string().min(16).optional()),
  BOOKING_API_AUTH_SECRET: emptyStringToUndefined(z.string().min(24).optional()),
  BOOKING_VIEW_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().max(3600).default(600),
  DEFAULT_GUEST_NATIONALITY: z.string().length(2).default('US'),
  GOOGLE_PLACES_API_KEY: emptyStringToUndefined(z.string().optional()),
  NEXT_PUBLIC_SUPABASE_URL: emptyStringToUndefined(z.string().url().default('https://example.supabase.co')),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: emptyStringToUndefined(z.string().min(1).default('supabase-anon-placeholder')),
  SUPABASE_SERVICE_ROLE_KEY: emptyStringToUndefined(z.string().min(1).default('supabase-service-role-placeholder')),
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

const parsedEnv = envSchema.parse(process.env);

export type LiteApiRuntimeConfig = {
  mode: 'sandbox' | 'production';
  apiKey: string;
  baseUrl: string;
  bookBaseUrl: string;
};

export function getLiteApiRuntimeConfig(): LiteApiRuntimeConfig {
  const mode = parsedEnv.LITEAPI_ENV;
  const selectedApiKey = mode === 'production' ? parsedEnv.LITEAPI_PRODUCTION_API_KEY : parsedEnv.LITEAPI_SANDBOX_API_KEY;
  const selectedBaseUrl = mode === 'production' ? parsedEnv.LITEAPI_PRODUCTION_BASE_URL : parsedEnv.LITEAPI_SANDBOX_BASE_URL;
  const selectedBookBaseUrl = mode === 'production'
    ? parsedEnv.LITEAPI_PRODUCTION_BOOK_BASE_URL
    : parsedEnv.LITEAPI_SANDBOX_BOOK_BASE_URL;

  return {
    mode,
    apiKey: selectedApiKey ?? parsedEnv.LITEAPI_API_KEY,
    baseUrl: selectedBaseUrl ?? parsedEnv.LITEAPI_BASE_URL,
    bookBaseUrl: selectedBookBaseUrl ?? parsedEnv.LITEAPI_BOOK_BASE_URL
  };
}

function isPlaceholderValue(value: string | undefined, patterns: string[]): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return patterns.some((pattern) => normalized === pattern || normalized.includes(pattern));
}

export function assertProductionReadiness(): void {
  if (parsedEnv.NODE_ENV !== 'production') {
    return;
  }

  const problems: string[] = [];

  if (isPlaceholderValue(parsedEnv.LITEAPI_API_KEY, ['placeholder', 'your_liteapi_api_key'])) {
    const selectedKey = getLiteApiRuntimeConfig().apiKey;
    if (isPlaceholderValue(selectedKey, ['placeholder', 'your_liteapi_api_key'])) {
      problems.push('LiteAPI key for selected LITEAPI_ENV must be set to a real key in production.');
    }
  }
  if (!parsedEnv.QUOTE_SIGNING_SECRET) {
    problems.push('QUOTE_SIGNING_SECRET is required in production.');
  }
  if (!parsedEnv.BOOKING_VIEW_TOKEN_SECRET) {
    problems.push('BOOKING_VIEW_TOKEN_SECRET is required in production.');
  }
  if (!parsedEnv.LITEAPI_WEBHOOK_SECRET) {
    problems.push('LITEAPI_WEBHOOK_SECRET is required in production.');
  }
  if (isPlaceholderValue(parsedEnv.SUPABASE_SERVICE_ROLE_KEY, ['placeholder', 'your_service_role_key'])) {
    problems.push('SUPABASE_SERVICE_ROLE_KEY must be set in production.');
  }
  if (!parsedEnv.UPSTASH_REDIS_REST_URL || !parsedEnv.UPSTASH_REDIS_REST_TOKEN) {
    problems.push('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production.');
  }
  if (!parsedEnv.BOOKING_API_AUTH_SECRET) {
    problems.push('BOOKING_API_AUTH_SECRET is required in production to protect booking APIs.');
  }
  if (parsedEnv.LITEAPI_ENV === 'sandbox') {
    problems.push('LITEAPI_ENV must be set to production for production runtime.');
  }
  if (!parsedEnv.STRICT_PERSISTENCE_MODE) {
    problems.push('STRICT_PERSISTENCE_MODE must be true in production.');
  }

  if (problems.length > 0) {
    throw new Error(`Production configuration invalid:\n- ${problems.join('\n- ')}`);
  }
}

const runtimeConfig = getLiteApiRuntimeConfig();

export const env = {
  ...parsedEnv,
  LITEAPI_API_KEY: runtimeConfig.apiKey,
  LITEAPI_BASE_URL: runtimeConfig.baseUrl,
  LITEAPI_BOOK_BASE_URL: runtimeConfig.bookBaseUrl
};
