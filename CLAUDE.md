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
- **Scripture comes out of our own database, and nowhere else.** `/api/bible`
  reads `bible_text` and 404s on a miss; it does not call anyone. The catalogue
  in `languages.json` is generated from that table, so the console can never
  offer a translation it cannot serve — do not add one to the catalogue without
  mirroring it first. `bible_text` holds one chapter per row as
  `[[verse, text], …]`, and the route's `chapterOf` is the contract between
  that row and what the client reads — change one and change the other. A
  missing row means "not copied yet" and falls through; a row with an empty
  `verses` array means the upstream genuinely has nothing there, which is the
  honest answer for Abkhazian and Ossetian outside the New Testament.
- **A translation the operator uploaded is theirs, and it may bring a language
  with it.** `Lang` is `BuiltInLang | \`x:${string}\``: the six are rows in
  `languages.json`, and an `x:` code resolves through `registerLangs` instead,
  because it lives in the operator's own rows. Filing everything under the six
  could never let Spanish sit beside English on a slide, which is what
  `showData` being keyed by language means. A custom language's spec rides in
  the payload (`ProjectorStyle.langs`) exactly as an added typeface does, and
  `useCustomLangs` registers it in a memo, before the book name is read. Its
  names come out of the file or fall back to English; its order is always
  canonical. The picker is the 184 ISO 639-1
  languages (`isoLanguages.json`), and `langOf` is the one place an ISO code
  becomes either one of the six or an `x:` code — keyed by the language, so two
  files in it share a row. A language exists only while a translation of it
  does. The only thing a translation may
  disagree with its language about is the psalm split — measured off the file
  by `import/psalms.ts`, never asked — and `lib/bible/custom.ts` — pure, tested —
  is the one place a stored `custom:<id>` becomes a name, a scheme or a picker
  entry, and where a pick naming a translation since deleted falls back rather
  than 404-ing on the wall. `bible_translation_text` holds the same columns as
  `bible_text` so `chapterOf` stays one function. The file is parsed in the
  browser (`lib/bible/import/`, pure and tested) and the rows go up under RLS.
  The panel also browses two public archives and fetches straight from them —
  an import may reach the network, a *reading* never does, which is the same
  line `scripts/mirror.mjs` sits on;
  `/api/bible` reads a custom translation with the caller's own client, never
  `admin()`, so the policy is the ownership check and no route has to remember
  one.
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
- **A font the operator adds is a link, never a file.** `settings.customFonts`
  holds `{ id, label, kind, source }` — a Google Fonts family, or an https link
  to a woff2/woff/ttf/otf — and the pickers store it as `custom:<id>`. Nothing
  about a typeface goes through the peer-asset path a background does: an
  output already has the network, so it fetches the face itself. Only the faces
  a slide actually names ride in the payload, and `lib/projector/fonts.ts` is
  the one place that turns a stored value into a class or a family — it is
  pure, it is tested, and a value naming a font that has since been deleted
  falls back there rather than on the wall. Third-party CSS is never injected:
  a Google URL is one we build, and a pasted link is wrapped in our own
  `@font-face`.
- **A plan limit is a number, and it lives twice.** Free is not a trial: the
  Bible, both outputs and the stage are never gated. What Pro buys is volume —
  the ceilings in `lib/billing/limits.json`. The console writes to Supabase
  directly under RLS, so the console's check is a courtesy and `free_limit()`
  in the migration is the rule; `limits.test.ts` reads both and fails when they
  drift. Triggers raise `plan_limit:<key>` and `planErrorMessage` turns that
  into what the operator reads. Only inserts are checked — a downgrade never
  deletes a church's work. Both switches (`NEXT_PUBLIC_ENFORCE_GATES` and
  `billing_config.enforce`) are meant to move together.
- **The billing webhook is the source of truth, not checkout.** A subscription
  ends, lapses and resumes with no browser present. `/api/billing/webhook` is
  the only writer of `subscriptions`, and it finds the operator by
  `metadata.user_id` or the `provider_customer_id` stored before checkout.
- **Media is never uploaded.** Backgrounds and music stay in IndexedDB; the
  database holds metadata only. Do not "simplify" this into Supabase Storage
  without asking — it is a deliberate cost decision.

## Researching before you dig

Before grepping the codebase or reading files to understand *why* something is
shaped the way it is, check `docs/vault/00-Index.md` first. It's a one-page
list of every feature note, each titled with the decision it records — reading
it costs a fraction of what a code search does. If a title matches what you're
about to touch, read that one note (`docs/vault/Features/<name>.md`) instead
of reconstructing the reasoning from the diff or from scratch. If nothing
matches, fall back to the code and `git log` as usual — the vault only covers
choices a reasonable person would question, not everything shipped.

Keep the two note types separate: a vault note explains a past decision and
can't stop you from redoing it wrong; a rule in `.ai/rules/` fires mid-edit
and is what actually prevents the mistake — see `docs/vault/rules-vs-notes.md`
for which one applies. Don't read the whole vault or every rule file up
front — match by filename/keyword against the task, open only what's
relevant.

## Conventions

- No comments in code. Names should carry the meaning; if a line needs a
  comment to be understood, rename or restructure it instead. The one
  exception is a non-obvious *why* — a workaround for a specific bug, a
  hidden constraint, an invariant a reader would otherwise violate — and even
  then keep it to one line.
- Functional components, named exports, Tailwind 4 utilities inline. Console
  chrome is dark, and only dark — `--color-studio-*` in `globals.css` is the
  whole palette, so no component reaches for `bg-white`, a Tailwind grey or a
  hex of its own. Three brand colours sit under those tokens: ink `#191818`,
  cream `#FDF7E8` and yellow `#FCDF50`. Yellow is a light colour, so anything
  filled with `bg-studio-accent` takes `text-studio-onaccent`, never
  `text-white`. `components/brand/Wordmark.tsx` is the only drawing of the
  llama — the app bar, the marketing header, the login page and `app/icon.svg`
  all come from it.
- Typefaces the operator can pick are Tailwind class names (`font-banner`, …)
  stored verbatim in `settings.font`. They are declared in `@theme` in
  `globals.css`; adding one means adding it there, dropping the woff2 subsets
  in `public/fonts`, and adding a row to `BUILT_IN_FONTS` in
  `lib/projector/fonts.ts`.
- Server components load data; client components hold state. The console is
  handed everything it needs as `initial` props rather than fetching after
  paint — opening it mid-service and watching a spinner is the thing to avoid.
- Writes from the console are debounced (`useDebouncedSave`). A slider drag is
  dozens of renders and must not be dozens of round trips.
- The service-role client (`lib/supabase/admin.ts`) bypasses RLS. It is only for
  routes that have authorised the caller another way: a verified Dodo Payments
  webhook signature, or a session's `output_key`.
- **Never use Claude in Chrome (or any browser-automation tool) in this
  project.** Verify a change by curling the dev server and grepping the
  markup, running `eslint`/`tsc`, reading the rendered HTML, or asking the
  user to look — not by driving a browser.
