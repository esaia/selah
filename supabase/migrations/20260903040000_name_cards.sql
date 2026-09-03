-- Name cards: who is speaking, strapped across the bottom of the stream.
--
-- The one graphic a church broadcast uses constantly and Selah could not draw.
-- A card belongs to the stream alone: it goes up while a verse stays live
-- underneath and comes away without disturbing it, which is why it is stored
-- beside the slide rather than inside `show_data`.

-- The people an operator keeps: their regular preachers, worship leaders and
-- guests. Shaped like `songs` and `audio_tracks` — one row per item, owned by
-- a user, ordered by a column they can drag.
create table public.name_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  -- The name, and the only field that has to be filled in.
  title text not null,
  -- The role beneath it. Often empty: a guest musician has no title.
  subtitle text not null default '',
  -- Which design draws it. Text rather than an enum so a new design is a
  -- release rather than a migration; the reader falls back to a design that
  -- exists, so a value from a future version cannot reach a stream unstyled.
  template text not null default 'band',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index name_cards_user_position_idx on public.name_cards (user_id, position);

alter table public.name_cards enable row level security;

create policy "own name cards" on public.name_cards
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create trigger name_cards_touch before update on public.name_cards
  for each row execute function public.touch_updated_at();

-- What is on the stream right now, so an overlay that opens or reloads
-- mid-card picks it up rather than showing nothing.
--
-- It holds the shape of a run — the card, when it fired, and how long it holds
-- — never a countdown. Every reader works the rest out from its own clock,
-- which is the same rule the stage timer follows and for the same reason: a
-- number ticking over the wire is a message a second and drifts on a slow
-- connection.
alter table public.session_state
  add column if not exists card jsonb;
