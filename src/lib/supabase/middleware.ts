import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/** Paths an unauthenticated visitor may reach. */
const PUBLIC = ['/', '/pricing', '/docs', '/login', '/auth', '/show', '/lower3rd', '/api/bible', '/api/live', '/api/stripe'];

const isPublic = (pathname: string) =>
  PUBLIC.some(path => pathname === path || pathname.startsWith(`${path}/`));

/**
 * Refresh the auth cookie on every request and keep signed-out visitors out of
 * the console.
 *
 * The output pages are deliberately public: a projector machine and an OBS
 * Browser Source have no account, and the session's unguessable output_key in
 * the URL is what authorises them.
 */
export const updateSession = async (request: NextRequest) => {
  let response = NextResponse.next({ request });

  // Before `.env.local` is filled in there is no auth to refresh and nothing to
  // guard. Failing open here keeps the marketing pages readable on a fresh
  // clone instead of turning every route into a 500.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: cookies => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Must run before any redirect: this is what refreshes an expiring token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic(request.nextUrl.pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return response;
};
