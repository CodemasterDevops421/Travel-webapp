import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/shared/env.public';

export function createClient() {
  return createBrowserClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
