---
type: feature
status: shipped
---

# An oversized import opens a partial picker instead of being refused

Importing a bundle bigger than the plan allows doesn't fail outright — it opens a picker
with as many items pre-selected as the plan permits.

**Code:** the ProPresenter import flow

## What it does

1. An import larger than the remaining ceiling is read in full.
2. A picker opens with the first items, up to the limit, already ticked, and the rest left
   in the file for a later import.

## Decisions

### Over-the-limit imports pick a subset instead of failing

**Chosen:** The import flow opens a partial picker pre-ticked up to the plan's remaining
room, rather than rejecting the whole bundle.
**Over:** Refusing the import entirely until the operator is on a plan that fits the whole
bundle.
**Why:** An outright refusal is honest but useless when the operator only wanted a handful
of songs from a much larger bundle for this Sunday. The cost is that import now has
partial-success state to maintain, instead of a single pass-or-fail outcome.

## Links

- [[00-Index]]
