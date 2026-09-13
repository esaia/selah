import { createClient } from '@supabase/supabase-js';

import type { Database } from './types';

export const admin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — /api/bible, /show and /lower3rd cannot run without it.');
  }

  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};
