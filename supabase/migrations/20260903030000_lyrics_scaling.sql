-- How song text is sized on the projector.
--
-- Scaling to fit is what makes one line fill the screen and six lines still fit
-- on it; it is also what makes the words breathe in and out across a verse,
-- which some rooms do not want. `lyrics_scale` is the choice, in the vocabulary
-- an operator already has from other presentation software, and `lyrics_size`
-- is the size the three non-automatic modes are bounds on — a share of the
-- screen height, so it means the same thing on any projector.
--
-- The 'steady' layout said the same thing badly and is retired; `fromRow` reads
-- it as this pair, so nobody's choice is lost.
alter table public.settings
  add column lyrics_scale text not null default 'both',
  add column lyrics_size int not null default 9;
