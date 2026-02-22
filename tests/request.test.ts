import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

describe('request helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('TRUST_PROXY_HEADERS', 'false');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    vi.stubEnv('LITEAPI_API_KEY', 'test');
    vi.stubEnv('QUOTE_SIGNING_SECRET', '1234567890abcdef');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service');
  });

  it('extracts first forwarded IP and prefers x-real-ip in non-production', async () => {
    const { getClientIp } = await import('@/server/request');

    const forwardedReq = new NextRequest('https://example.com/api/test', {
      headers: {
        'x-forwarded-for': '1.2.3.4, 5.6.7.8'
      }
    });
    expect(getClientIp(forwardedReq)).toBe('1.2.3.4');

    const realReq = new NextRequest('https://example.com/api/test', {
      headers: {
        'x-real-ip': '9.9.9.9',
        'x-forwarded-for': '1.2.3.4'
      }
    });
    expect(getClientIp(realReq)).toBe('9.9.9.9');
  });

  it('rejects malformed IP headers', async () => {
    const { getClientIp } = await import('@/server/request');

    const request = new NextRequest('https://example.com/api/test', {
      headers: {
        'x-real-ip': 'not-an-ip',
        'x-forwarded-for': 'also-not-ip, 300.1.1.1'
      }
    });

    expect(getClientIp(request)).toBe('anonymous');
  });

  it('does not trust forwarded headers in production when trust flag is disabled', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TRUST_PROXY_HEADERS', 'false');
    vi.stubEnv('LITEAPI_API_KEY', 'prod-key');
    vi.stubEnv('QUOTE_SIGNING_SECRET', '1234567890abcdef');
    vi.stubEnv('BOOKING_VIEW_TOKEN_SECRET', '1234567890abcdef');
    vi.stubEnv('LITEAPI_WEBHOOK_SECRET', 'webhook-secret-123');
    vi.stubEnv('BOOKING_API_AUTH_SECRET', 'abcdefghijklmnopqrstuvwxyz123456');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
    vi.stubEnv('STRICT_PERSISTENCE_MODE', 'true');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'real-service-role-key');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');

    const { getClientIp } = await import('@/server/request');
    const request = new NextRequest('https://example.com/api/test', {
      headers: {
        'x-real-ip': '9.9.9.9',
        'x-forwarded-for': '1.2.3.4'
      }
    });

    expect(getClientIp(request)).toBe('anonymous');
  });

  it('uses request correlation id headers or generates one', async () => {
    const { getCorrelationId } = await import('@/server/request');

    const requestWithId = new NextRequest('https://example.com/api/test', {
      headers: {
        'x-request-id': 'rid-123'
      }
    });
    expect(getCorrelationId(requestWithId)).toBe('rid-123');

    const requestWithoutId = new NextRequest('https://example.com/api/test');
    expect(getCorrelationId(requestWithoutId).length).toBeGreaterThan(10);
  });
});
