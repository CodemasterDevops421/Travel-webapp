import 'server-only';

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const cacheStore = new Map<string, CacheEntry<unknown>>();
const inflightStore = new Map<string, Promise<unknown>>();

const MAX_CACHE_KEYS = 5000;

function pruneExpired(now: number): void {
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt <= now) {
      cacheStore.delete(key);
    }
  }

  while (cacheStore.size > MAX_CACHE_KEYS) {
    const oldestKey = cacheStore.keys().next().value;
    if (!oldestKey) break;
    cacheStore.delete(oldestKey);
  }
}

export async function getOrSetAdminReportCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = cacheStore.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.value as T;
  }

  const inflight = inflightStore.get(key);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const promise = (async () => {
    try {
      const value = await loader();
      cacheStore.set(key, {
        value,
        expiresAt: now + (Math.max(1, Math.floor(ttlSeconds)) * 1000)
      });
      pruneExpired(Date.now());
      return value;
    } finally {
      inflightStore.delete(key);
    }
  })();

  inflightStore.set(key, promise);
  return promise;
}

export function invalidateAdminReportCache(prefixes: string[]): void {
  if (prefixes.length === 0) return;
  for (const key of cacheStore.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      cacheStore.delete(key);
    }
  }
}
