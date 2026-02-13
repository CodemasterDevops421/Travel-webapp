export const CACHE_TTL_SECONDS = {
  autocomplete: 90,
  propertyPreview: 300
} as const;

export const CACHE_STALE_TIME_MS = {
  autocomplete: CACHE_TTL_SECONDS.autocomplete * 1_000,
  propertyPreview: CACHE_TTL_SECONDS.propertyPreview * 1_000
} as const;
