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

## Name cards

Who is speaking, strapped across the bottom of the stream — the one graphic a
church broadcast uses constantly. The **Lower3rd** tab holds the people an
operator keeps (their preachers, worship leaders, guests) and five finished
designs. Type a name and a role, pick a design, and it plays over the stream
and takes itself away.

Two things are worth knowing about it.

**A card goes to the OBS overlay alone.** The projector keeps its verse and the
stage keeps its clock. That is why a card rides *beside* `showData` in the
payload rather than inside it: `showData` means "what the room is seeing", and
a name card is precisely not that. It is laid over whatever the lower third is
already showing, and when it goes the verse is still underneath — the same
arrangement the stage timer has with the projector.

**The hold does not tick over the wire.** The payload carries when a card fired
and how long it holds, and every overlay counts down on its own clock. So an
overlay that opens halfway through a card gets the rest of it, and a console
that closed cannot leave one on the stream forever. Same rule as the timer, and
for the same reason.

The designs live in `globals.css` as `.namecard--<name>`, and the picker
renders that real markup shrunk into a tile, so a design and its preview cannot
drift. Unlike the verse bar — which only ever fades, because movement on every
verse change pulls the eye off the speaker — the cards animate in and out. A
card fires once, as a deliberate act, and a strap that simply appears reads as
a glitch.

## Where the verses come from

**Our own database, and nowhere else.** `bible_text` holds every translation
the console offers — one row per chapter, holding only `[[verse, text], …]`.
That is the unit the console asks for, so a read is a primary-key lookup, and a
chapter is over the TOAST threshold so Postgres compresses each row without
being asked. Seventeen translations across six languages come to about 35 MB.

`/api/bible` used to be a proxy with a cache in front of `holybible.ge`. It no
longer talks to anyone. A church's Sunday morning does not depend on a
stranger's shared PHP host being awake, and a chapter we do not hold is a 404
rather than a fetch — quietly reaching outward would put the dependency back
the moment someone armed a language nobody had mirrored.

That is also why `lib/bible/languages.json` is generated from what is in
`bible_text`: the catalogue and the corpus are the same list, so the console
cannot offer a translation it is unable to serve. Adding one means mirroring it
first.

### Adding a translation

`pnpm mirror --set scripts/mirror-set.json` fills the database. It walks
language → translation → book → chapter, takes the chapter count from
`books.json` rather than trusting the API's own (which says Leviticus has 40
chapters and 2 John has 3), and writes in batches. Two things matter about it:

- **It resumes.** It reads the keys it already has and skips them, so stopping
  it costs nothing and a re-run after adding a translation does only the new
  work. A full run is ~20,000 chapters.
- **It is slow on purpose,** and stops when refused. `--rps` and
  `--concurrency` cap it; a 403 or 468 ends the run rather than being retried.
  An early attempt at three requests a second was blocked after seven thousand
  chapters, and the retries are what turned a warning into a block.

`pnpm mirror-verify` picks stored chapters at random and compares them verse by
verse against the source — a copy nobody has checked is a rumour.
`pnpm mirror-gaps` lists chapters holding fewer verses than `versification.ts`
expects, and `--refill` tells a real gap from a verse the translation simply
does not have: it keeps a re-fetch only when it comes back longer.

Then regenerate the catalogue so the console offers the new translation.

These scripts are the only things that reach the network, they are run by hand,
and they hold their own address — nothing in `.env` points at a scripture host,
because the running product has no use for one.

## Languages

A console opens on English and the operator adds up to two more, from the six
we hold a copy of — Georgian, English, Russian, Greek, Arabic and Latin. `lib/bible/languages.json` is the whole
catalogue: a label, the translations, the book names, and the two things that
actually vary — Georgian or English book ordering, Septuagint or Masoretic
psalms. `lib/bible/languages.ts` imports and types it; it is JSON so that the
scripts can read it too, and `LANGS` in the `.ts` is what makes `Lang` a closed
union. The two have to agree, and `mapping.test.ts` checks that they do.
Its contents are exactly what `bible_text` holds; `scripts/languages.mjs`
refreshes the book names and translation lists from the source when a new
language is mirrored.

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
