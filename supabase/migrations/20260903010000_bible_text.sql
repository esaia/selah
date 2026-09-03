-- A local copy of the scripture, so a Sunday morning does not depend on a
-- third party's shared PHP host staying up.
--
-- `bible_cache` next door holds whole upstream responses keyed by query string,
-- and it stays: it is what covers a translation we have not copied yet. This
-- table is the copy itself, and the route handler reads it first.
--
-- One row is one chapter of one translation — the same unit the console asks
-- for, so a read is a primary-key lookup and nothing has to be assembled. It
-- holds only the verses; an upstream response repeats the book names, the
-- translation list and the language list on every single chapter, which is
-- roughly half of what comes down the wire. A chapter is also comfortably over
-- the TOAST threshold, so Postgres compresses each row without being asked —
-- measured between 3.2x (English) and 5.4x (Georgian), which is what brings the
-- whole 47-translation corpus in around 100 MB.
create table public.bible_text (
  -- The API's own language code, and the `mv` string verbatim: the two halves
  -- of a request, stored the way the request spells them.
  lang     text not null,
  version  text not null,
  -- `w` and `t`: the book id in this language's own ordering, and the chapter.
  book     int  not null,
  chapter  int  not null,
  -- The book id the API stamps on each verse. Always book - 3 in everything
  -- seen so far, but stored rather than derived — it costs one int and it is
  -- what the outputs print the book name from.
  wigni    int  not null,
  -- How many chapters this book has here, which is all `tavi[0].cc` ever said.
  chapters int  not null,
  -- [[muxli, bv], ...] in the order the API returned them.
  --
  -- An empty array is a fact, not a gap: Abkhazian and Ossetian are New
  -- Testament only and their Old Testament chapters genuinely come back empty.
  -- A missing *row* is what means "not copied yet", and that is what sends the
  -- route handler on to the live API.
  verses   jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (lang, version, book, chapter)
);

-- Written by the mirror script and read by the scripture proxy, both holding
-- the service-role key. Nobody else touches it, so RLS is on with no policies —
-- exactly as bible_cache is.
alter table public.bible_text enable row level security;
