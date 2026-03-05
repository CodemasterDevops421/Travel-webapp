import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/server/env';
import { HttpError } from '@/server/errors';

type AdminPrincipal = {
  id: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

const ADMIN_ROLES = new Set(['admin', 'owner']);
const ADMIN_AUTHZ_CACHE_TTL_MS = 30_000;
const ADMIN_AUTHZ_CACHE_MAX_KEYS = 10_000;

type AdminAuthzCacheEntry = {
  allowed: boolean;
  expiresAt: number;
};

const adminAuthzCache = new Map<string, AdminAuthzCacheEntry>();

function normalizeRole(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase().trim() : '';
}

function hasAdminClaim(user: AdminPrincipal): boolean {
  const appRole = normalizeRole(user.app_metadata?.role);
  return ADMIN_ROLES.has(appRole);
}

function pruneAdminAuthzCache(now: number): void {
  for (const [key, entry] of adminAuthzCache.entries()) {
    if (entry.expiresAt <= now) {
      adminAuthzCache.delete(key);
    }
  }
  while (adminAuthzCache.size > ADMIN_AUTHZ_CACHE_MAX_KEYS) {
    const oldestKey = adminAuthzCache.keys().next().value;
    if (!oldestKey) break;
    adminAuthzCache.delete(oldestKey);
  }
}

function setAdminAuthzCache(userId: string, allowed: boolean): void {
  const now = Date.now();
  adminAuthzCache.set(userId, {
    allowed,
    expiresAt: now + ADMIN_AUTHZ_CACHE_TTL_MS
  });
  if (adminAuthzCache.size > ADMIN_AUTHZ_CACHE_MAX_KEYS) {
    pruneAdminAuthzCache(now);
  }
}

function getAdminAuthzCache(userId: string): boolean | null {
  const now = Date.now();
  const entry = adminAuthzCache.get(userId);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= now) {
    adminAuthzCache.delete(userId);
    return null;
  }
  return entry.allowed;
}

export function __unsafeResetAdminAuthzCacheForTests(): void {
  adminAuthzCache.clear();
}

export function assertBookingApiAuthorized(request: NextRequest): void {
  const configuredSecret = env.BOOKING_API_AUTH_SECRET;
  if (!configuredSecret) {
    return;
  }

  const presentedSecret = request.headers.get('x-booking-api-key') ?? '';
  if (presentedSecret !== configuredSecret) {
    throw new HttpError(401, 'Unauthorized booking API request.');
  }
}

export async function assertAdminAuthorized(
  supabase: SupabaseClient,
  user: AdminPrincipal | null | undefined
): Promise<void> {
  if (!user?.id) {
    throw new HttpError(401, 'Unauthorized');
  }

  if (hasAdminClaim(user)) {
    return;
  }

  const cachedDecision = getAdminAuthzCache(user.id);
  if (cachedDecision === true) {
    return;
  }
  if (cachedDecision === false) {
    throw new HttpError(403, 'Forbidden');
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, role, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw new HttpError(403, 'Forbidden');
  }

  const isActive = data?.is_active === true;
  const role = typeof data?.role === 'string' ? data.role.toLowerCase() : '';
  const allowed = ADMIN_ROLES.has(role);

  if (!isActive || !allowed) {
    setAdminAuthzCache(user.id, false);
    throw new HttpError(403, 'Forbidden');
  }

  setAdminAuthzCache(user.id, true);
}
