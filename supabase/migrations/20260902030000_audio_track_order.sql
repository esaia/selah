-- A library is the running order, so the order has to be the operator's own:
-- every track carries a position it can be dragged into. Existing libraries are
-- seeded with the order they were added in, which is what they showed before.
alter table public.audio_tracks
  add column position int not null default 0;

update public.audio_tracks as track
set position = ordered.rank
from (
  select id, row_number() over (partition by user_id order by created_at) as rank
  from public.audio_tracks
) as ordered
where ordered.id = track.id;

create index audio_tracks_user_position_idx on public.audio_tracks (user_id, position);
