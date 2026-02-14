import { describe, expect, it } from 'vitest';
import { CACHE_STALE_TIME_MS, CACHE_TTL_SECONDS } from '@/shared/lib/cache-ttl';

describe('cache ttl constants', () => {
  it('keeps staleTime aligned with backend autocomplete ttl', () => {
    expect(CACHE_STALE_TIME_MS.autocomplete).toBe(CACHE_TTL_SECONDS.autocomplete * 1_000);
    expect(CACHE_TTL_SECONDS.autocomplete).toBe(90);
  });

  it('keeps staleTime aligned with backend property preview ttl', () => {
    expect(CACHE_STALE_TIME_MS.propertyPreview).toBe(CACHE_TTL_SECONDS.propertyPreview * 1_000);
    expect(CACHE_TTL_SECONDS.propertyPreview).toBe(300);
  });
});
