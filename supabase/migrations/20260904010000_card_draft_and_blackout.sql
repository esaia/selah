-- The name-card form the console was left on: name, role, design, hold.
--
-- The design and the hold are settings rather than fields — they decide what
-- every strap looks like and how long it stays, whoever's name is in it — and
-- losing them to a reload meant setting the look up again with the camera
-- live. The console remembers every other thing the operator arranged before
-- a service; this is no different.
--
-- `name_cards.template` keeps its default and is no longer written: a saved
-- person is a name and a role, and the look is the operator's.
alter table public.session_workspace
  add column if not exists card_draft jsonb;

-- Which screens the operator has taken to black.
--
-- Not a clear: the verse stays live and the run keeps counting underneath, and
-- one press puts the screen back as it was. It is stored beside the slide so a
-- projector that reloads while the room is dark comes back dark rather than
-- lighting the wall up mid-prayer.
alter table public.session_state
  add column if not exists blackout jsonb;
