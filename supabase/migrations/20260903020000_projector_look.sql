-- The layout the projector draws a slide in.
--
-- The stream has had this since the start — `lower_third_variant` and
-- `lyrics_variant` — and the projector had one hard-coded layout: verses fitted
-- to the screen with the reference underneath. These two columns give it the
-- same choice. The values are the look ids in `lib/projector/looks.ts`, kept as
-- plain text for the same reason the lower third's are: adding a look is a row
-- in that file and a block of CSS, never a migration.
alter table public.settings
  add column projector_look text not null default 'below',
  add column projector_lyrics_look text not null default 'fill';
