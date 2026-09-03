# Selah

The console churches use to put scripture and song lyrics on a projector and a
livestream — in up to three languages at the same time, picked from everything
the scripture API carries.

This is the rewrite of `mybible` (Create React App, `localStorage`, no accounts)
as a subscription product: Next.js + Supabase, studio console only, with Google
sign-in and per-user plans.

## Running it

```bash
pnpm install
cp .env.example .env.local     # fill in the Supabase values
pnpm supabase start            # local Postgres + Auth + Realtime (needs Docker)
pnpm supabase db reset         # apply supabase/migrations
pnpm dev
```

`pnpm supabase start` prints the API URL and the anon / service-role keys for
`.env.local`. For Google sign-in, create an OAuth client and add it as a
Supabase Auth provider with `http://localhost:3000/auth/callback` as the
redirect.

```bash
pnpm test        # vitest — psalm mapping, book remap, block operations
pnpm typecheck
pnpm build

pnpm languages       # re-fetch the book names and translation lists (rarely)
pnpm mirror          # copy the scripture into our own database (see below)
pnpm mirror-verify   # check that copy against the live API
pnpm mirror-gaps     # find chapters that came back short
```

## How it fits together

Three surfaces, one session:

| Route | Who opens it | Signed in |
| --- | --- | --- |
| `/studio` | the operator | yes |
| `/show/<output_key>` | the machine driving the projector | no |
| `/lower3rd/<output_key>` | an OBS Browser Source | no |
| `/stage/<output_key>` | the stage display: current slide, next slide, clock and run | no |

A session has an unguessable `output_key`. The outputs are addressed by it and
join the realtime channel named after it — knowing the URL is the credential,
so a projector needs no account. Treat those links the way you would a meeting
link.

**The slide travels twice.** `pushShow()` writes `session_state` and broadcasts
on the channel. The broadcast is what makes a change instant; the row is what a
projector reads when it opens or reloads, so a machine that joins mid-service is
never staring at black. Style travels *with* the slide, because an output page
has no account and cannot read the operator's settings row.

**The stage timer does not tick over the wire.** A clock broadcast a frame at
a time would be a realtime message a second, and a screen on a slow connection
would drift visibly. What travels is the shape of the run — which timer is
armed, whether it is running, when it was last resumed and what had elapsed
before that — and every output counts the seconds itself from its own clock.
`lib/timer/model.ts` is pure and tested for the same reason the block
operations are: getting it wrong shows the wrong number rather than failing.
The run rides the slide's own payload, so an output that joins mid-service is
handed the verse and the countdown together, and `session_state.timer` is what
it reads when it opens. Armed onto the projector it takes the slide's place —
the verse stays mounted underneath, so disarming brings it straight back.

**Media stays on the operator's machine.** Backgrounds and music go into this
browser's IndexedDB, never a bucket. Only a file's identity rides with the
slide; a projector on another machine pulls the bytes from the console over a
WebRTC data channel, signalled through the same realtime channel (STUN only, no
TURN). A received file is cached, so a reload — or a console that has since been
shut — does not blank the screen.

## What the old app did that this does not

- The **obs-websocket bridge** is gone. An OBS Browser Source reaches Supabase
  Realtime over WSS directly, which removes the vendor-event hop, the
  JSON-string workaround for OBS's `obs_data_t` marshalling, and the
  mixed-content/loopback restriction that kept the console on the same machine
  as OBS.
- The **Cloudflare relay Worker** is gone. Realtime replaces the room, and the
  scripture proxy moved to `/api/bible` with a Postgres cache.
- **`localStorage` is gone** as a transport and as storage. Two dozen keys —
  each read with a bare `getItem` in three places — are now one `settings` row
  and one `session_state` row.
- The **classic console** (`/`), the plain reader, the docs page and the
  donation page are not ported.

## Where the verses come from

Three places, in this order, all behind `/api/bible` so nothing above the route
handler knows the difference:

1. **`bible_text`** — our own copy. One row is one chapter of one translation,
   holding only `[[verse, text], …]`. That is the same unit the console asks
   for, so a read is a primary-key lookup, and a chapter is over the TOAST
   threshold so Postgres compresses each row without being asked. All 47
   translations come to roughly 100 MB.
2. **`bible_cache`** — whole upstream responses, keyed by query string. Covers
   whatever the copy does not have: a translation added upstream since the last
   mirror run, or a request that names no translation.
3. **`holybible.ge`** — the live API, and the reason for the two above it. It is
   a third party on shared hosting with no account and no contract; a service
   should not depend on it being awake.

`pnpm mirror` fills the copy. It walks language → translation → book → chapter,
takes the chapter count from `tavi[0].cc` rather than trusting a table, and
writes in batches. Two things matter about it:

- **It resumes.** It reads the keys it already has and skips them, so stopping
  it costs nothing and running it again after adding a language does only the
  new work. A whole run is ~55,900 chapters, about five hours at three requests
  a second.
- **It is slow on purpose.** `--rps` and `--concurrency` cap it. holybible.ge is
  someone's ministry on cheap shared hosting; the copy should be invisible to
  them.

`pnpm mirror --dry-run` says what the work would be. `--lang` and `--version`
narrow it to one translation, which is how to re-pull a single one.

`pnpm mirror-verify` picks stored chapters at random, asks the API for the same
ones and compares them verse by verse. A copy nobody has checked is a rumour.

`pnpm mirror-gaps` lists chapters holding fewer verses than `versification.ts`
says they should. A short chapter is one of three things and the row alone
cannot say which: the translation genuinely omits the verse (the NIV has no
Matthew 17:21, the KJV does), the API has nothing for that chapter at all
(Abkhazian and Ossetian outside the New Testament), or the fetch went wrong.
`--refill` is what tells them apart — it re-fetches each suspect and keeps the
result only when it has *more* verses than what is stored, so a genuine
omission is left alone.

Do not trust the API's own chapter count. `tavi[0].cc` says Leviticus has 40
chapters and 2 John has 3; the real numbers live in `books.json`, which mirrors
`versification.ts` and is checked against it by a test. The same file carries
the verse counts the gap report reads and the English book remap, because the
scripts cannot import TypeScript.

Both scripts read `.env.local` for the service-role key and talk to PostgREST
over plain `fetch` — no client library, so they run on any Node that has
`fetch`.

Note that roughly half the translations on offer are under active copyright
(NIV, NASB, ESV, NRSV, Reina Valera 1960, Kutsal Kitap 1989, the 2015 Georgian
revision). Proxying a third party with a cache is one posture; holding a
permanent copy inside a paid product is another. The table has a `version`
column, so narrowing to the public-domain ones is a `delete` and a shorter list.

## Languages

A console opens on English and the operator adds up to two more, from the
fourteen the scripture API carries. `lib/bible/languages.json` is the whole
catalogue: a label, the translations, the book names, and the two things that
actually vary — Georgian or English book ordering, Septuagint or Masoretic
psalms. `lib/bible/languages.ts` imports and types it; it is JSON so that the
scripts can read it too, and `LANGS` in the `.ts` is what makes `Lang` a closed
union. The two have to agree, and `mapping.test.ts` checks that they do.
Everything but Georgian, English and Russian is generated from the API by
`scripts/languages.mjs`. German is listed upstream but returns English text, so
it is left out on purpose.

English cannot be removed: it is what every output falls back to when the
language the stream or the stage was pointed at goes away.

## Domain vocabulary

The scripture API is Georgian, and its field names are kept where they face it:
`wigni` = book, `tavi` = chapter, `muxli` = verse, `bv` = the verse HTML. Book
ids follow Georgian canonical order (Genesis = 4, because the name arrays begin
with three group headers); English orders the epistles differently and is
remapped in `lib/bible/englishBooks.ts`. Psalms are numbered Septuagint in
Georgian and Russian and Masoretic in English — `lib/bible/psalms.ts` reconciles
them, and it is covered by tests because getting it wrong shows the wrong verse
rather than failing.

## Layout

```
src/
  app/                     routes: marketing, login, /studio, /show, /lower3rd, /api
  components/
    projector/             what the outputs draw (shared by the console preview)
    studio/                the console
  lib/
    bible/                 languages, versification, psalms, book remap, chapter loading
scripts/                   the language catalogue, and the scripture mirror
    billing/               plans, entitlements, Stripe
    live/                  the realtime channel and its payloads
    media/                 IndexedDB + WebRTC file transfer
    projector/             fit-to-height text, themes, transitions
    studio/                console state, settings mapping, block operations
supabase/migrations/       the schema
```

## Plans

`lib/billing/plans.ts` names what Free and Pro include and `can()` checks it —
but `NEXT_PUBLIC_ENFORCE_GATES` is off, so everything is unlocked for everyone.
Turning it on is the one switch that makes every gate bite at once.
