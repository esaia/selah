---
name: log-feature
description: Record a thin vault note for work just completed — but only if it involved a choice a reasonable person would question. Usage: /log-feature <name>
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(git show:*), mcp__laravel-boost__record-rule
---

# Log a feature note

Feature name: `$1` (if empty, infer it from the working diff).

## Step 1 — the trigger question

Read the work first: `git status --short`, `git diff`, and `git log --oneline -5`.

Then answer this, out loud, before writing anything:

> **Did this work involve a choice a reasonable person would question?**

The question is *not* "is this a feature?". Shipping a capability is not by itself a
reason to write. A CRUD endpoint that looks like every other CRUD endpoint earns no note.

**If the answer is no:** say so plainly, write nothing, and skip to Step 5. Do not soften
it into a short note. A note that records nothing surprising is worse than no note — it
goes stale, and it teaches the next reader that this vault is not worth reading.

## Step 2 — write the note

Only if Step 1 passed. Copy `docs/vault/_templates/feature.md` to
`docs/vault/Features/<name>.md` and fill it in.

Hard limits:

- The opening is **one or two sentences** on what a user can now do. Not a paragraph.
- `## What it does` is a numbered walk of one request, only as long as it needs to be for
  the decisions to make sense. **No file-by-file tour. No restatement of what the tests
  assert.** `git show` does both better and never goes stale. Content re-derivable from
  the diff is exactly the content that later misleads.
- `## Decisions` is why the note exists. One `###` per choice, each stating what was
  chosen, what was rejected, and why — including what the choice costs. If you cannot fill
  it, go back to Step 1: the answer was no.
- **Only the decisions that mattered get an entry — expect one or two, rarely three.**
  Step 1's bar is applied again here, per decision, not once for the note as a whole. A
  choice earns its `###` only if it passes both:

  1. A competent teammate reading the diff would stop and ask why — it is not simply what
     anyone would have done in that spot.
  2. Knowing the answer changes what someone does later: whether they can swap the
     approach out, what breaks if they do, where the next feature of this shape should go.

  Everything else is cut, not shortened. Placeholders awaiting a missing piece, naming and
  file placement, following a convention the project already has, an alternative rejected
  because it plainly does not work — these are not decisions, they are the work. If a note
  is heading for four or more entries, they are not all important: keep the ones that
  survive both tests and let the diff speak for the rest.
- **`**Why:**` is two sentences. Hard cap.** One for the reason the alternative loses, one
  for what this choice costs. That is the whole budget, and the reader is a colleague, not
  a stranger — state the reason, do not build up to it.

  Cut, always: restatements of `Chosen` or `Over`; explanations of how the framework
  behaves; the failure story of how it was got wrong first; "revisit when…", which belongs
  in `docs/vault/Backlog.md`. If two sentences genuinely cannot carry it, that is a sign
  the entry is two decisions — split it, or drop the weaker one.
- **`## Decisions` must read without the code open.** No class, method, config-key, event
  or rule-string names anywhere in it, and no code fences — describe what a thing does
  instead of naming it. Names go on the `**Code:**` line at the top and nowhere else.
  Identifiers go stale faster than reasoning, and an argument a reader has to grep to
  follow is one they will not follow.
- The note is only ever: the opening, the `**Code:**` / `**Tests:**` lines,
  `## What it does`, `## Decisions`, `## Links`. Add no other section. There is no traps
  section — a trap goes in `.ai/rules`, where it fires while the code is being edited. And
  no follow-ups section — unfinished work goes in `docs/vault/Backlog.md`, the one place
  that tracks it.
- Aim for roughly 80% surprises. If you are explaining something obvious to justify
  length, cut it.

Use `[[wikilinks]]` by basename so the graph works in Obsidian, but never depend on the app.

**Do not record a commit SHA in the note.** A note pointing at the wrong commit is worse
than one pointing at nothing, and `git log` answers the question anyway.

## Step 3 — update the index and backlog

- `docs/vault/00-Index.md`: add the note under a `## Features` list (create the section if
  it does not exist yet).
- `docs/vault/Backlog.md`: move or add the item under `## Shipped`, linked to the note.

## Step 4 — consider a rule instead of, or as well as, a note

**Do this even when Step 1 answered no.** Ask:

> Is there anything here a future agent could trip over *mid-edit*?

A note is read afterwards, if at all. A rule in `.ai/rules` fires at the moment code is
written, which is the only moment it can prevent the mistake. Non-obvious traps, settled
decisions with an ongoing constraint, and "always do X here" belong in rules.

If yes, record it with the `record-rule` MCP tool — a `glob`, a short `title`, a few-line
`note`. Never restate the same rule in both the vault and `.ai/rules`; pick one home and
cross-reference. Rules win for anything actionable during an edit.

## Step 5 — report

State in one or two lines: whether a note was written (and why, or why not), and whether a
rule was recorded. Nothing else.
