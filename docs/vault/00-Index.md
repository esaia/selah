---
type: index
---

# LlamaPresenter vault

The map of this vault. Everything reachable from here; nothing filed anywhere else.

Open `docs/vault` as an Obsidian vault (Open folder as vault) if you want the graph and
backlinks. Nothing here depends on the app — these are plain markdown files and
`[[wikilinks]]` by basename, readable on GitHub and in any editor.

## What lives where

| Where | Holds | Written by |
| --- | --- | --- |
| `Features/` | One note per shipped feature that involved a questionable choice | `/log-feature` |
| [[Backlog]] | Unfinished work, and a `## Shipped` log linking to notes | `/log-feature`, by hand |
| `_templates/feature.md` | The shape a feature note takes | by hand |
| `.ai/rules/` (outside the vault) | Traps that must fire *mid-edit*, not afterwards | by hand |

Read `README.md` for the architecture and `CLAUDE.md` for the working agreement. This vault
is neither — it records *why* a particular piece of work came out the way it did, in cases
where the diff alone would mislead.

## The bar

A note exists only when the work involved a choice a reasonable person would question.
Shipping a capability is not by itself a reason to write one. Content re-derivable from
`git show` is exactly the content that later goes stale, so it is cut rather than
shortened.

If the thing you want to record is actionable *while code is being edited* — "always do X
here", a non-obvious trap — it belongs in `.ai/rules`, not here. See
[[rules-vs-notes]] for which home to pick.

## Features

- [[selah-realtime-transport]] — one realtime channel plus a persisted row replaced three transports
- [[music-library-is-the-running-order]] — a library opened on the rail is the played order
- [[stage-lookahead-slide-and-layered-clear]] — the stage sees what's next, and Clear is per-layer
- [[modal-exit-owns-unmount-timing]] — every dialog animates out, including footer actions
- [[projector-looks-as-data]] — layouts are a shared table, not three hand-kept implementations
- [[lyric-search-host-allowlist]] — a search key is validated before the server fetches it
- [[blanking-is-not-clearing]] — blank hides the picture; clear empties the data
- [[song-languages-are-operator-named]] — a song's languages aren't the Bible's catalogue
- [[operator-drawn-layouts-relative-units]] — boxes are fractions of the frame, reused for stream straps
- [[scripture-search-as-db-function]] — verse text matching runs in the database, not the route
- [[output-chrome-lives-on-the-machine]] — flip/fullscreen are per-browser, never per-session
- [[plan-ceiling-blocks-growth-not-recovery]] — a ceiling blocks crossing it, never blocks retreating under it
- [[partial-import-picker-over-limit]] — an oversized import opens a partial picker, not a refusal
- [[playlists-counted-libraries-not]] — a playlist counts against the free ceiling; a library doesn't
- [[pro-editor-open-gated-at-save]] — the Pro editor opens for anyone, gated only at Save
- [[pricing-page-shares-limits-table]] — pricing copy is generated from the console's own limit data
- [[founding-seat-stamped-not-counted]] — a founding rung is stamped once, never recomputed
- [[custom-bible-translations-rls-ownership]] — ownership of an uploaded translation is a database policy
- [[watermark-shipped-then-reverted]] — a Free-tier mark was built, then fully reverted
- [[annual-pricing-separate-product-per-cadence]] — cadence is which product was bought, not a coupon
- [[admin-flag-service-role-only]] — the admin flag can only be written by the service role
- [[anonymous-demo-full-console]] — the no-signup demo is the real console, not a separate build
- [[guests-treated-as-pro]] — a guest session is unconditionally Pro, not a raised Free ceiling
- [[paste-never-republishes-live-slide]] — pasting after the live slide never pushes it to the wall
- [[mini-sidebar-hydration-shape]] — sidebar width is stamped pre-hydration; its shape waits

## Links

- [[Backlog]]
- [[rules-vs-notes]]
