import { createClient } from '@supabase/supabase-js';

import type { Database } from './types';

/**
 * Service-role client. Bypasses RLS, so it may only be used from route handlers
 * that have already authorised the caller some other way — the Stripe webhook
 * signature, or a session's unguessable output_key.
 */
export const admin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Worth naming: without this key the scripture proxy and both output pages
  // fail, and the underlying client only says "supabaseKey is required".
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — /api/bible, /show and /lower3rd cannot run without it.');
  }

  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};
