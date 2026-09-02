import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * Where Google sends the operator back to, with a code to exchange for a
 * session.
 *
 * Three things can go wrong and they need telling apart, because the fix for
 * each is somewhere else: the provider itself refused (its own `error` params
 * come back on this URL), no code arrived at all (the redirect never went
 * through Supabase), or the exchange failed (usually the PKCE verifier cookie
 * is missing, or the redirect URL is not on the project's allow-list). The
 * reason is passed on to /login rather than flattened into one flag.
 */
export const GET = async (request: NextRequest) => {
  const { searchParams, origin } = request.nextUrl;
  const next = searchParams.get('next') || '/studio';

  const fail = (reason: string) => {
    console.error('[auth/callback]', reason);

    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);
  };

  const providerError = searchParams.get('error_description') || searchParams.get('error');

  if (providerError) return fail(providerError);

  const code = searchParams.get('code');

  if (!code) return fail('No sign-in code came back from Google.');

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) return fail(error.message);

  return NextResponse.redirect(`${origin}${next}`);
};
