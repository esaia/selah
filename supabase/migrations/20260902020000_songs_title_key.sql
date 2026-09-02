-- Importing a library replaces songs of the same title, which needs an upsert
-- that can name its conflict target. PostgREST can only name plain columns, and
-- the uniqueness we actually want is case-insensitive — so the lowercased title
-- becomes a stored generated column and the index moves onto that.
alter table public.songs
  add column title_key text generated always as (lower(title)) stored;

drop index if exists public.songs_user_title_idx;

create unique index songs_user_title_key_idx on public.songs (user_id, title_key);
