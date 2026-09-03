-- Which list the open song was picked out of.
--
-- The workspace already remembers *which* song is open; on a reload it came
-- back opened from the library, because that was the only thing it could
-- assume. A song picked off the playlist lays the whole running order out and
-- lights its row there, so forgetting this reopened the console in a different
-- place from the one the operator left it in.
alter table public.session_workspace
  add column song_scope text not null default 'library';
