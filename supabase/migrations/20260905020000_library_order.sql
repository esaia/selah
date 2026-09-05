-- A library is a running order, and so is the list of libraries: the one a
-- service starts from should be able to sit at the top rather than wherever
-- its name falls in the alphabet.
--
-- Written to survive being applied twice: the column may already be there from
-- a hand-run in the SQL editor, and a backfill that renumbered every row would
-- undo the drags done since.
alter table public.audio_categories
  add column if not exists position integer not null default 0;

-- Libraries made before this keep the order they were shown in, which was by
-- name, so nothing moves under an operator on the way in. Only rows never
-- placed are touched.
with ranked as (
  select id, row_number() over (partition by user_id order by name) as place
  from public.audio_categories
  where position = 0
)
update public.audio_categories as category
set position = ranked.place
from ranked
where ranked.id = category.id;
