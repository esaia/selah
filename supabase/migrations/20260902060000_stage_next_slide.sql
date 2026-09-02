-- The slide after the live one.
--
-- The stage display shows the operator's running order one step ahead, and the
-- console is the only thing that knows what that step is: the outputs are handed
-- a slide, never the workspace it came from. So the next card is published with
-- the live one and stored beside it, for the same reason `show_data` is — a
-- stage screen switched on mid-service should read "up next" straight away
-- rather than wait for the operator to advance.
--
-- Same shape as `show_data`: it is one, just not the one on the projector.
alter table public.session_state
  add column if not exists next_show_data jsonb not null
    default '{"geo":[],"eng":[],"rus":[]}'::jsonb;
