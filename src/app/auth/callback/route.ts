import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

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
