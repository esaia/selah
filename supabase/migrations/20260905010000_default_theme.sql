-- A new console starts on Fragrance II rather than Background 1: a soft prism
-- blur that words sit on, instead of a photograph competing with them.
--
-- The default only decides what a fresh row is born with, which is the whole
-- point — an operator who chose Background 1 on purpose keeps it.
alter table public.settings alter column theme set default '31';
