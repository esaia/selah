-- Selah initial schema.
--
-- Every table that belongs to an operator carries user_id and is closed by RLS.
-- The one exception is bible_cache, which is shared scripture text and is written
-- only by the service role.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- helpers

-- Output pages (/show, /lower3rd) run on machines that are not signed in, so a
-- session is addressed by an unguessable key in the URL. 26 chars of base32ish.
create or replace function public.gen_output_key() returns text
language sql volatile as $$
  select string_agg(substr('abcdefghijklmnopqrstuvwxyz0123456789', (get_byte(b, i) % 36) + 1, 1), '')
  from (select gen_random_bytes(26) as b) g, generate_series(0, 25) as i;
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ---------------------------------------------------------------- identity

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free',
  status text not null default 'active',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- live session

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null default 'Service',
  output_key text not null unique default public.gen_output_key(),
  created_at timestamptz not null default now()
);
create index sessions_user_id_idx on public.sessions (user_id);

-- What the outputs are showing right now. Read by late joiners through a
-- service-role route handler keyed on sessions.output_key, then kept current by
-- realtime broadcast. Replaces the relay Durable Object's stored `last`.
create table public.session_state (
  session_id uuid primary key references public.sessions on delete cascade,
  show_data jsonb not null default '{"geo":[],"eng":[],"rus":[]}'::jsonb,
  projector jsonb not null default '{}'::jsonb,
  stream_style jsonb not null default '{}'::jsonb,
  stream_lang text not null default 'geo',
  updated_at timestamptz not null default now()
);

-- The console's working state: imported passages, what is live, the setlist.
-- blocks stays a single jsonb array because it is mutated as a whole on every
-- collapse / reorder / split / join; writes are debounced client-side.
create table public.session_workspace (
  session_id uuid primary key references public.sessions on delete cascade,
  blocks jsonb not null default '[]'::jsonb,
  live jsonb,
  setlist jsonb not null default '[]'::jsonb,
  active_song_id text,
  tab text not null default 'bible',
  card_size int not null default 190,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- settings

-- One row replacing every projector-look localStorage key from the old app.
create table public.settings (
  user_id uuid primary key references auth.users on delete cascade,
  admin_lang text not null default 'geo',
  admin_version text not null default '',
  enabled jsonb not null default '{"geo":true,"eng":false,"rus":false}'::jsonb,
  versions jsonb not null default '{}'::jsonb,
  theme text not null default '1',
  dynamic_image text not null default '',
  local_image jsonb,
  font text not null default 'font-banner',
  align text not null default 'left',
  lyrics_font text not null default 'font-banner',
  lyrics_align text not null default 'left',
  transition_ms int not null default 320,
  lang_order jsonb not null default '["eng","geo","rus"]'::jsonb,
  lower_third_position text not null default 'bottom',
  lower_third_variant text not null default 'scrim',
  lyrics_variant text not null default 'scrim',
  obs_hidden boolean not null default false,
  stream_lang text not null default 'geo',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- lyrics

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  slides jsonb not null default '[]'::jsonb,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Importing a ProPresenter bundle replaces a song of the same title.
create unique index songs_user_title_idx on public.songs (user_id, lower(title));

-- ---------------------------------------------------------------- audio

create table public.audio_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index audio_categories_user_id_idx on public.audio_categories (user_id);

-- A local track's bytes never leave the operator's machine: they stay in this
-- browser's IndexedDB and are addressed by local_id. The row is metadata only,
-- so the library survives a reload and lists a file the machine no longer has.
create table public.audio_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('url', 'local')),
  title text not null,
  artist text not null default '',
  src text,
  local_id text,
  size bigint,
  category_id uuid references public.audio_categories on delete set null,
  duration_ms int,
  created_at timestamptz not null default now()
);
create index audio_tracks_user_id_idx on public.audio_tracks (user_id);

create table public.audio_playlist (
  user_id uuid not null references auth.users on delete cascade,
  track_id uuid not null references public.audio_tracks on delete cascade,
  position int not null,
  primary key (user_id, track_id)
);

-- ---------------------------------------------------------------- bible cache

-- Scripture is immutable, so entries never expire. Written only by the service
-- role from /api/bible; shaped so a full local import can replace the upstream
-- fetch without any client change.
create table public.bible_cache (
  cache_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- triggers

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();
create trigger session_state_touch before update on public.session_state
  for each row execute function public.touch_updated_at();
create trigger session_workspace_touch before update on public.session_workspace
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();
create trigger songs_touch before update on public.songs
  for each row execute function public.touch_updated_at();

-- A new operator gets everything they need to open the console: a profile, a
-- free subscription, default settings, and one session with its output key.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare new_session uuid;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email,
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'avatar_url');

  insert into public.subscriptions (user_id) values (new.id);
  insert into public.settings (user_id) values (new.id);

  insert into public.sessions (user_id) values (new.id) returning id into new_session;
  insert into public.session_state (session_id) values (new_session);
  insert into public.session_workspace (session_id) values (new_session);

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- RLS

alter table public.profiles           enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.sessions           enable row level security;
alter table public.session_state      enable row level security;
alter table public.session_workspace  enable row level security;
alter table public.settings           enable row level security;
alter table public.songs              enable row level security;
alter table public.audio_categories   enable row level security;
alter table public.audio_tracks       enable row level security;
alter table public.audio_playlist     enable row level security;
alter table public.bible_cache        enable row level security;

create policy "own profile" on public.profiles
  for all using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Subscriptions are readable by their owner but only the Stripe webhook
-- (service role) may write them.
create policy "read own subscription" on public.subscriptions
  for select using (user_id = (select auth.uid()));

create policy "own sessions" on public.sessions
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own settings" on public.settings
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own songs" on public.songs
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own audio categories" on public.audio_categories
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own audio tracks" on public.audio_tracks
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own playlist" on public.audio_playlist
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.owns_session(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sessions s
                 where s.id = target and s.user_id = (select auth.uid()));
$$;

create policy "own session state" on public.session_state
  for all using (public.owns_session(session_id)) with check (public.owns_session(session_id));
create policy "own session workspace" on public.session_workspace
  for all using (public.owns_session(session_id)) with check (public.owns_session(session_id));

-- Scripture text is public to read; only the service role fills it.
create policy "read bible cache" on public.bible_cache for select using (true);
