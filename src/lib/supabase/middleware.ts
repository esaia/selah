import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC = [
  '/',
  '/pricing',
  '/faq',
  '/compare',
  '/solutions',
  '/use-cases',
  '/propresenter-alternative',
  '/propresenter-vs-easyworship',
  '/easyworship-alternative',
  '/freeshow-alternative',
  '/proclaim-alternative',
  '/stagetimer-alternative',
  '/docs',
  '/login',
  '/auth',
  '/show',
  '/lower3rd',
  '/timer',
  '/opengraph-image',
  '/api/bible',
  '/api/live',
  '/api/billing/webhook',
];

const isPublic = (pathname: string) =>
  PUBLIC.some(path => pathname === path || pathname.startsWith(`${path}/`));

export const updateSession = async (request: NextRequest) => {
  let response = NextResponse.next({ request });

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic(request.nextUrl.pathname)) {
    const back = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    const login = request.nextUrl.clone();

    login.pathname = '/login';
    login.search = '';
    login.searchParams.set('next', back);

    return NextResponse.redirect(login);
  }

  return response;
};
