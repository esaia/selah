# CLAUDE.md

Read `README.md` first — it covers the architecture, the transport, and the
domain vocabulary. This file is the working agreement on top of it.

## Non-negotiables

- **`showData` is a contract.** `{ geo, eng, rus, lyrics? }` with verses shaped
  `{ bv, wigni, tavi, muxli }`. The console, both outputs, the preview panel and
  the `session_state` row all speak it. Changing it means changing all of them.
- **Style travels with the slide.** `/show` and `/lower3rd` have no account and
  cannot read `settings`. Anything the outputs need goes in the payload.
- **Psalm and book mapping is load-bearing.** `lib/bible/psalms.ts` and
  `lib/bible/englishBooks.ts` decide which verse appears. They have tests; keep
  them passing.
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
