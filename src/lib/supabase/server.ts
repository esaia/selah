import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

import type { Database } from './types';

export const configured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const createClient = async () => {
  const store = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: cookies => {
          try {
            cookies.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Called from a Server Component, where cookies are read-only. The
            // middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
};

/**
 * The signed-in operator, or null.
 *
 * Tolerates an unconfigured project so the marketing pages render on a fresh
 * clone, before anyone has filled in `.env.local`.
 */
export const getUser = async (): Promise<User | null> => {
  if (!configured()) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  } catch {
    return null;
  }
};
