import { describe, expect, it } from 'vitest';
import { CACHE_STALE_TIME_MS, CACHE_TTL_SECONDS, DISCOVERY_SUPPLIER_TTL_SECONDS } from '@/shared/lib/cache-ttl';

describe('cache ttl constants', () => {
  it('keeps staleTime aligned with backend autocomplete ttl', () => {
    expect(CACHE_STALE_TIME_MS.autocomplete).toBe(CACHE_TTL_SECONDS.autocomplete * 1_000);
    expect(CACHE_TTL_SECONDS.autocomplete).toBe(90);
  });

  it('keeps staleTime aligned with backend property preview ttl', () => {
    expect(CACHE_STALE_TIME_MS.propertyPreview).toBe(CACHE_TTL_SECONDS.propertyPreview * 1_000);
  });

  it('keeps supplier-backed discovery ttl values inside 5-15 minute policy', () => {
    expect(DISCOVERY_SUPPLIER_TTL_SECONDS.min).toBeGreaterThanOrEqual(300);
    expect(DISCOVERY_SUPPLIER_TTL_SECONDS.max).toBeLessThanOrEqual(900);
    expect(CACHE_TTL_SECONDS.propertyPreview).toBeGreaterThanOrEqual(DISCOVERY_SUPPLIER_TTL_SECONDS.min);
    expect(CACHE_TTL_SECONDS.propertyPreview).toBeLessThanOrEqual(DISCOVERY_SUPPLIER_TTL_SECONDS.max);
    expect(CACHE_TTL_SECONDS.hotelRates).toBeGreaterThanOrEqual(DISCOVERY_SUPPLIER_TTL_SECONDS.min);
    expect(CACHE_TTL_SECONDS.hotelRates).toBeLessThanOrEqual(DISCOVERY_SUPPLIER_TTL_SECONDS.max);
  });
});
