-- Typefaces the operator added themselves.
--
-- A list of { id, label, kind, source }, where `source` is a Google Fonts
-- family name or a direct link to a font file. Only the reference is stored:
-- the outputs fetch the face over the connection they already need for
-- realtime, so nothing here is ever uploaded.
alter table public.settings
  add column if not exists custom_fonts jsonb not null default '[]'::jsonb;
