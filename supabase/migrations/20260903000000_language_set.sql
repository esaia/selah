-- The operator picks the languages, instead of being given three.
--
-- The console used to be wired to Georgian, English and Russian: a fixed three
-- everywhere, down to these column defaults. It now opens on English alone and
-- the operator adds up to two more from everything the scripture API carries,
-- so a default can no longer name a language that is not English.
--
-- Two knock-on changes. `show_data` holds only the languages a slide actually
-- carries, so an empty slide is `{}` rather than three empty arrays. And
-- Russian is now keyed `ru`, the code the API itself uses, which retires the
-- one place we translated a language code on the way out.
--
-- Existing rows are reset rather than migrated: the set is a handful of clicks
-- to rebuild, and carrying `rus` forward would mean keeping the alias alive in
-- code for the sake of one row.

alter table public.settings
  alter column admin_lang set default 'eng',
  alter column enabled set default '{"eng":true}'::jsonb,
  alter column lang_order set default '["eng"]'::jsonb,
  alter column stream_lang set default 'eng',
  alter column stage_lang set default 'eng';

update public.settings
set admin_lang = 'eng',
    admin_version = '',
    enabled = '{"eng":true}'::jsonb,
    versions = '{}'::jsonb,
    lang_order = '["eng"]'::jsonb,
    stream_lang = 'eng',
    stage_lang = 'eng';

alter table public.session_state
  alter column show_data set default '{}'::jsonb,
  alter column next_show_data set default '{}'::jsonb,
  alter column stream_lang set default 'eng',
  alter column stage_lang set default 'eng';

update public.session_state
set show_data = '{}'::jsonb,
    next_show_data = '{}'::jsonb,
    stream_lang = 'eng',
    stage_lang = 'eng';
