-- Which language the stage display reads.
--
-- The projector can carry all three armed languages at once; the stage monitor
-- shows one, because the person standing up is reading it rather than glancing
-- at it. Until now that one was whichever armed language came first in the
-- order — a choice made for them by a drag they did for the projector's sake.
--
-- Stored beside `stream_lang`, and for the same reason: the outputs have no
-- account, so the operator's pick has to travel with the slide and be waiting
-- in the row for a monitor switched on mid-service.
alter table public.settings
  add column if not exists stage_lang text not null default 'geo';

alter table public.session_state
  add column if not exists stage_lang text not null default 'geo';
