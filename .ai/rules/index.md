# Rules

Read before writing code. `/new-feature` opens this file, reads every rule whose globs
cover the paths it expects to touch, then greps this directory for the feature's domain
terms — a path match alone misses cross-cutting rules.

A rule that contradicts what you were about to do wins.

## Where the standing agreement lives

`CLAUDE.md` at the repo root holds the project-wide non-negotiables — the `showData`
contract, style travelling with the slide, the language catalogue, scripture coming only
from our own database, the timer never ticking over the wire, media never being uploaded.
Those are not repeated here. This directory holds **glob-scoped** rules: traps that only
apply while a particular set of files is open.

Never state the same constraint in both places. See `docs/vault/rules-vs-notes.md` for
which home a piece of knowledge takes.

## Index

| Rule | Globs |
| --- | --- |
| [projector-negative-zindex-stacking](projector-negative-zindex-stacking.md) | `src/components/projector/**` |

Add a row whenever you add a file. An unindexed rule is an unread rule.

## The shape of a rule file

One file per trap, named for what it protects. Front matter carries the globs; the body is
a few lines, not an essay — it is read mid-edit, competing with the task at hand.

```markdown
---
globs:
  - "src/lib/bible/**"
title: Book numbering is asked of specOf, never branched on
---

<What goes wrong, in a sentence or two.>

<What to do instead.>
```

Keep the body under roughly ten lines. If it needs more, the reasoning belongs in a vault
note and only the actionable line stays here.
