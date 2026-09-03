// The little bit of Supabase the mirror scripts need, over plain fetch.
//
// Not `@supabase/supabase-js`: that pulls in a realtime client which wants a
// global WebSocket, so it refuses to start on Node 20. These scripts read rows
// and write rows, and PostgREST does both over HTTP with two headers.

import { readFile } from 'node:fs/promises';

/**
 * `.env.local` the way `next dev` reads it, so the scripts need no setup of
 * their own — the service-role key is already there and belongs nowhere else.
 * A real environment variable wins, for CI or a one-off override.
 */
export const env = async () => {
  const file = await readFile(new URL('../.env.local', import.meta.url), 'utf8').catch(() => '');
  const values = Object.fromEntries(
    file
      .split('\n')
      .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/))
      .filter(Boolean)
      .map(([, name, value]) => [name, value.trim().replace(/^["']|["']$/g, '')]),
  );

  return { ...values, ...process.env };
};

/**
 * A service-role PostgREST client. It bypasses RLS, which is why it only ever
 * runs from a laptop against `bible_text` — the same rule as `lib/supabase/admin.ts`.
 */
export const connect = async () => {
  const values = await env();
  const url = values.NEXT_PUBLIC_SUPABASE_URL;
  const key = values.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (they are in .env.local).');
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  const call = async (path, init = {}) => {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: { ...headers, ...init.headers },
    });

    if (!response.ok) {
      throw new Error(`${init.method ?? 'GET'} ${path} — ${response.status} ${await response.text()}`);
    }

    return response;
  };

  return {
    /** One page of rows. `query` is a PostgREST query string. */
    select: async (table, query, from, to) => {
      const response = await call(`${table}?${query}`, {
        headers: from === undefined ? {} : { Range: `${from}-${to}`, 'Range-Unit': 'items' },
      });

      return response.json();
    },

    /** How many rows match, without fetching any of them. */
    count: async (table, query = 'select=lang') => {
      const response = await call(`${table}?${query}`, {
        method: 'HEAD',
        headers: { Prefer: 'count=exact', Range: '0-0' },
      });

      return Number(response.headers.get('content-range')?.split('/')[1]) || 0;
    },

    /** Insert or replace, on the table's primary key. */
    upsert: async (table, rows) => {
      await call(table, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows),
      });
    },
  };
};
