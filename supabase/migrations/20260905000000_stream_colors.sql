-- What the stream's looks are painted in, held apart from the looks themselves.
--
-- `{ verses: { plate, ink, accent }, lyrics: { … } }`, each key a six-digit hex
-- and every one of them optional: a key that is absent is the look's own
-- colour, which is what lets an operator who never opens the swatches keep
-- exactly the overlay they had.
alter table public.settings
  add column if not exists stream_colors jsonb not null default '{}'::jsonb;

-- "Black bands" was never a layout — it was the bands layout in two colours.
-- Rows naming it become the one bands look, painted the way they looked.
update public.settings
set
  stream_colors = coalesce(stream_colors, '{}'::jsonb)
    || case when lower_third_variant = 'bandsdark'
         then jsonb_build_object('verses', jsonb_build_object('plate', '#0a0c10', 'ink', '#ffffff'))
         else '{}'::jsonb end
    || case when lyrics_variant = 'bandsdark'
         then jsonb_build_object('lyrics', jsonb_build_object('plate', '#0a0c10', 'ink', '#ffffff'))
         else '{}'::jsonb end,
  lower_third_variant = case when lower_third_variant = 'bandsdark' then 'bands' else lower_third_variant end,
  lyrics_variant = case when lyrics_variant = 'bandsdark' then 'bands' else lyrics_variant end
where 'bandsdark' in (lower_third_variant, lyrics_variant);
