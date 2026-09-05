-- One library and one playlist was the shape of a church with one service.
-- A church with a Georgian congregation and an English one, or a Christmas
-- order kept from last December, needs several of each: libraries to file the
-- songs in, playlists to run a service from. ProPresenter's arrangement, which
-- is the one every operator in the room already knows.
--
-- A song lives in exactly one library, the way a document does there. A
-- playlist is an ordered list of songs from any library, and deleting it takes
-- nothing but the order with it.
--
-- Written to survive being applied twice.

create table if not exists public.song_libraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists song_libraries_user_id_idx on public.song_libraries (user_id);

create table if not exists public.song_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  -- The song ids, in the order they are sung. An array rather than a join
  -- table: the whole list is read at once and rewritten by a single drag, and
  -- a song that has since been deleted is simply skipped on the way in.
  songs jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists song_playlists_user_id_idx on public.song_playlists (user_id);

-- Null while the backfill below has not run, and for a song imported by a
-- console that has not learned about libraries yet; both are read as the first
-- library the operator has.
alter table public.songs
  add column if not exists library_id uuid references public.song_libraries on delete set null;

create index if not exists songs_library_id_idx on public.songs (library_id);

-- Which library or playlist the operator had open, so a console reopened
-- mid-service comes back to the list they were working from.
alter table public.session_workspace
  add column if not exists open_kind text not null default 'library',
  add column if not exists open_id text;

alter table public.song_libraries enable row level security;
alter table public.song_playlists enable row level security;

drop policy if exists "own song libraries" on public.song_libraries;
create policy "own song libraries" on public.song_libraries
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own song playlists" on public.song_playlists;
create policy "own song playlists" on public.song_playlists
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Everything already imported goes into one library, so no song is orphaned
-- and the panel opens on the list the operator already had.
insert into public.song_libraries (user_id, name)
select distinct song.user_id, 'Library'
from public.songs as song
where not exists (
  select 1 from public.song_libraries as library where library.user_id = song.user_id
);

update public.songs as song
set library_id = library.id
from public.song_libraries as library
where library.user_id = song.user_id and song.library_id is null;

-- And the one playlist a session was holding becomes the first named one,
-- rather than the running order for next Sunday being lost to this change.
insert into public.song_playlists (user_id, name, songs)
select distinct on (session.user_id) session.user_id, 'Playlist', coalesce(workspace.setlist, '[]'::jsonb)
from public.sessions as session
join public.session_workspace as workspace on workspace.session_id = session.id
where not exists (
  select 1 from public.song_playlists as playlist where playlist.user_id = session.user_id
)
order by session.user_id, session.created_at;
