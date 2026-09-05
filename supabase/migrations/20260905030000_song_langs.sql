-- A worship song is often sung in two languages at once, and the translation
-- belongs to the song rather than to the operator's Bible settings: a
-- congregation sings in languages we hold no scripture for, so a song names
-- its own.
--
-- The words themselves ride on the slides, inside the `slides` column that
-- already holds them, so nothing here has to be backfilled. This column holds
-- only the list and the two picks — `{ list: [{ id, label, on }], stage,
-- lower3rd }` — the way `settings` holds `enabled` and `versions`. An empty
-- object is a song with one language, which is every song written before now.
--
-- Written to survive being applied twice.
alter table public.songs
  add column if not exists langs jsonb not null default '{}'::jsonb;
