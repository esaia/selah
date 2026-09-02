-- The signup trigger pins `search_path = public` so it cannot be hijacked by a
-- schema earlier on the caller's path. That also hid `gen_random_bytes`, which
-- Supabase installs into `extensions` rather than `public`, so generating a
-- session's output key threw and took the whole signup transaction with it.
--
-- Rather than widen the trigger's search path back out, drop the dependency:
-- gen_random_uuid() is a server built-in in pg_catalog, needs no extension, and
-- two of them give 32 hex characters — the same alphabet the output-key routes
-- validate, and more entropy than the key needs.
create or replace function public.gen_output_key() returns text
language sql volatile
set search_path = ''
as $$
  select substr(translate(pg_catalog.gen_random_uuid()::text || pg_catalog.gen_random_uuid()::text, '-', ''), 1, 32);
$$;
