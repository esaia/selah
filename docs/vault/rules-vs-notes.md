---
type: reference
---

# Rules vs notes

Two places record what was learned, and they are not interchangeable.

## A rule fires mid-edit

`.ai/rules/` is read *before* code is written — `/new-feature` opens `index.md`, matches
globs against the paths it expects to touch, and greps the domain terms. A rule that
contradicts what an agent was about to do wins, at the only moment that can prevent the
mistake.

Rules take: non-obvious traps, settled decisions that impose an ongoing constraint, and
"always do X here".

## A note is read afterwards, if at all

`Features/` records why a choice came out the way it did, for the reader deciding months
later whether they can swap it out and what breaks if they do. It cannot prevent anything.

Notes take: the reasoning behind a choice a competent teammate would stop and question.

## Never both

Pick one home and cross-reference it. The same constraint stated twice drifts, and the
copy a reader happens to find first is the one they trust.

## Links

- [[00-Index]]
