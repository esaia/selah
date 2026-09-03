# CLAUDE.md

Read `README.md` first — it covers the architecture, the transport, and the
domain vocabulary. This file is the working agreement on top of it.

## Non-negotiables

- **`showData` is a contract.** A slide carries only the languages it has —
  `{ [lang]: Verse[], lyrics? }`, keyed by the API's own codes, with verses
  shaped `{ bv, wigni, tavi, muxli }`. The console, both outputs, the preview
  panel and the `session_state` row all speak it. Changing it means changing
  all of them.
- **Style travels with the slide.** `/show` and `/lower3rd` have no account and
  cannot read `settings`. Anything the outputs need goes in the payload.
- **Psalm and book mapping is load-bearing.** `lib/bible/psalms.ts` and
  `lib/bible/englishBooks.ts` decide which verse appears. They have tests; keep
  them passing.
- **A language is a row in `lib/bible/languages.json`, not a special case.** Two
  things vary — which book numbering the API wants and how the psalms are
  split — and `specOf(lang)` answers both. Never reach for `lang === 'eng'`.
  The operator's set is at most `MAX_LANGS` and always contains
  `REQUIRED_LANG`. The catalogue is JSON because `scripts/` reads it too;
  `LANGS` in `languages.ts` is what makes `Lang` a closed union, and a test
  keeps the two in step.
- **Scripture is read local-first.** `/api/bible` tries `bible_text`, then
  `bible_cache`, then the upstream host, and that order is the whole point of
  the route existing. `bible_text` holds one chapter per row as
  `[[verse, text], …]`, and the route's `chapterOf` is the contract between
  that row and what the client reads — change one and change the other. A
  missing row means "not copied yet" and falls through; a row with an empty
  `verses` array means the upstream genuinely has nothing there, which is the
  honest answer for Abkhazian and Ossetian outside the New Testament.
- **Nothing about the timer ticks over the channel.** `session_state.timer` and
  the `timer` field on the slide payload hold the *shape* of a run —
  `startedAt`, `elapsedBefore`, `adjustMs` — never a countdown. `sentAt` is
  stamped in the console's `payloadOf`, never kept in state, and only readers
  apply `withSkew`: a console that shifted the run on the way in would publish
  back something slightly different from what it received.
- **Block operations move the live pointer.** `live.verseIndex` is an index into
  `block.groups`, so prepending, joining or trimming has to move it. That logic
  lives in `lib/studio/blocks.ts`, is pure, and is tested — put new cases there
  rather than in the provider.
- **A name card is not a slide.** It rides beside `showData` in the payload,
  goes to `/lower3rd` alone, and is laid over whatever that output is already
  showing — the projector and the stage never see one. Its hold travels as
  `firedAt` + `holdMs` and is counted down by each reader, never over the wire.
  `lib/lower3rd/card.ts` is pure and tested; put new cases there.
- **Media is never uploaded.** Backgrounds and music stay in IndexedDB; the
  database holds metadata only. Do not "simplify" this into Supabase Storage
  without asking — it is a deliberate cost decision.

## Conventions

- Functional components, named exports, Tailwind 4 utilities inline. Console
  chrome is dark, and only dark.
- Typefaces the operator can pick are Tailwind class names (`font-banner`, …)
  stored verbatim in `settings.font`. They are declared in `@theme` in
  `globals.css`; adding one means adding it there and to `FONTS` in
  `SettingsModal`.
- Server components load data; client components hold state. The console is
  handed everything it needs as `initial` props rather than fetching after
  paint — opening it mid-service and watching a spinner is the thing to avoid.
- Writes from the console are debounced (`useDebouncedSave`). A slider drag is
  dozens of renders and must not be dozens of round trips.
- The service-role client (`lib/supabase/admin.ts`) bypasses RLS. It is only for
  routes that have authorised the caller another way: a verified Stripe
  signature, or a session's `output_key`.
