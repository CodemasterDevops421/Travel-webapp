import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/server/env';
import { HttpError } from '@/server/errors';

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
  userId: string | null | undefined
): Promise<void> {
  if (!userId) {
    throw new HttpError(401, 'Unauthorized');
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, role, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(403, 'Forbidden');
  }

  const isActive = data?.is_active === true;
  const role = typeof data?.role === 'string' ? data.role.toLowerCase() : '';
  const allowed = role === 'admin' || role === 'owner';

  if (!isActive || !allowed) {
    throw new HttpError(403, 'Forbidden');
  }
}
