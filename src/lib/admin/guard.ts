import type { User } from '@supabase/supabase-js';

import { admin } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';

export const getAdminUser = async (): Promise<User | null> => {
  const user = await getUser();

  if (!user) return null;

  const { data } = await admin().from('profiles').select('is_admin').eq('id', user.id).maybeSingle();

  return data?.is_admin ? user : null;
};
