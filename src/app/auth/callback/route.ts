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
  const state = searchParams.get('state');
  const nextParam = searchParams.get('next');
  const next = getSafeNextPath(nextParam);

  const isOAuthPath = state !== null || nextParam !== null;

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
  }

  // `state` is expected for OAuth callback flows.
  // Email confirmation callbacks do not include `state`, so only enforce this
  // constraint when request shape indicates an OAuth path.
  if (isOAuthPath && !state) {
    return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
  }

  const {
    data: { user },
    error: getUserError
  } = await supabase.auth.getUser();

  if (getUserError || !user) {
    return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
  }

  const provider = typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : '';
  if (provider === 'google' && !hasVerifiedEmail(user)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_email_unverified`);
  }

  const { error: upsertError } = await supabase.from('profiles').upsert(
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

  if (upsertError) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
