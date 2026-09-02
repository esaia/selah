import { createClient } from '@supabase/supabase-js';

import type { Database } from './types';

/**
 * Service-role client. Bypasses RLS, so it may only be used from route handlers
 * that have already authorised the caller some other way — the Stripe webhook
 * signature, or a session's unguessable output_key.
 */
export const admin = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
