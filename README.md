# Selah

The console churches use to put scripture and song lyrics on a projector and a
livestream — in Georgian, English and Russian at the same time.

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
```

## How it fits together

Three surfaces, one session:

| Route | Who opens it | Signed in |
| --- | --- | --- |
| `/studio` | the operator | yes |
| `/show/<output_key>` | the machine driving the projector | no |
| `/lower3rd/<output_key>` | an OBS Browser Source | no |

A session has an unguessable `output_key`. The outputs are addressed by it and
join the realtime channel named after it — knowing the URL is the credential,
so a projector needs no account. Treat those links the way you would a meeting
link.

**The slide travels twice.** `pushShow()` writes `session_state` and broadcasts
on the channel. The broadcast is what makes a change instant; the row is what a
projector reads when it opens or reloads, so a machine that joins mid-service is
never staring at black. Style travels *with* the slide, because an output page
has no account and cannot read the operator's settings row.

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
    bible/                 catalog, versification, psalms, book remap, chapter loading
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
