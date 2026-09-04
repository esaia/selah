-- The lower third's own typeface and alignment.
--
-- It used to be handed the projector's. A projector is a wall of text read
-- from the back of a room; a lower third is two lines over a camera shot,
-- often in a different typeface and almost always aligned differently. The
-- columns start empty and are read as "whatever the projector is set to", so
-- an operator who never opens the panel sees no change.
alter table public.settings
  add column if not exists stream_font text not null default '',
  add column if not exists stream_align text not null default '',
  add column if not exists stream_lyrics_font text not null default '',
  add column if not exists stream_lyrics_align text not null default '';
