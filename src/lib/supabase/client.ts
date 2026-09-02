'use client';

import { createBrowserClient } from '@supabase/ssr';

import type { Database } from './types';

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

let browserClient: ReturnType<typeof createClient> | null = null;

/** One client per document, so realtime channels and auth state are shared. */
export const supabase = () => (browserClient ??= createClient());
