-- A library is its own running order. Dragging a track inside one must not
-- disturb the order of All tracks, so a track carries both places: where it
-- sits in the whole list, and where it sits in the library it is filed in.
alter table public.audio_tracks
  add column library_position int not null default 0;

update public.audio_tracks as track
set library_position = ordered.rank
from (
  select id, row_number() over (partition by user_id, category_id order by position, created_at) as rank
  from public.audio_tracks
) as ordered
where ordered.id = track.id;
