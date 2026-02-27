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

function normalizeRole(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase().trim() : '';
}

function hasAdminClaim(user: AdminPrincipal): boolean {
  const appRole = normalizeRole(user.app_metadata?.role);
  const userRole = normalizeRole(user.user_metadata?.role);
  return ADMIN_ROLES.has(appRole) || ADMIN_ROLES.has(userRole);
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
    throw new HttpError(403, 'Forbidden');
  }
}
