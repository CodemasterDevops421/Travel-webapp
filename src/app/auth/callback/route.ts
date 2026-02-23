import { createServerSupabaseClient } from '@/server/supabase/server';
import { NextResponse } from 'next/server';

function getSafeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
}

function hasVerifiedEmail(user: {
  email?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
}): boolean {
  if (!user.email) {
    return false;
  }

  if (typeof user.email_confirmed_at === 'string' && user.email_confirmed_at.length > 0) {
    return true;
  }

  return user.user_metadata?.email_verified === true;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = getSafeNextPath(searchParams.get('next'));
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
  }

  if (!state) {
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_state_missing`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
  }

  const provider = typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : '';
  if (provider === 'google' && !hasVerifiedEmail(user)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_email_unverified`);
  }

  await supabase.from('profiles').upsert(
    {
      id: user.id,
      full_name: typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === 'string'
          ? user.user_metadata.name
          : null
    },
    { onConflict: 'id' }
  );

  return NextResponse.redirect(`${origin}${next}`);
}
