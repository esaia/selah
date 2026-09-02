-- The stage timer.
--
-- It lives beside the slide rather than in the settings row because it belongs
-- to the service, not to the operator's look: the outputs have no account and
-- read it from here when they open, exactly as they read the current slide.
--
-- Nothing ticks in this column. It holds the shape of the run — which timer is
-- armed, whether it is running, when it was last resumed — and every output
-- counts the seconds itself.
alter table public.session_state
  add column if not exists timer jsonb not null default '{}'::jsonb;
