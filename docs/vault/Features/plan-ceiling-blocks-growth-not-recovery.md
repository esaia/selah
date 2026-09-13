---
type: feature
status: shipped
---

# A plan ceiling blocks growing past it, never blocks getting back under

An account already over its limit — downgraded, or grandfathered in when gates first
turned on — can still remove items to get back under, instead of being stuck.

**Code:** the plan-limit guards checked on write

## What it does

1. A write is checked against "would this push the count past the limit," not "is the
   count currently over the limit."
2. Deleting or reducing is always allowed, even while already over, because it can only
   move the count down.

## Decisions

### The check compares before-and-after, not a single current count

**Chosen:** Every gated write compares the count before and after the write, and only
blocks it if the write itself would cross the ceiling.
**Over:** A blanket check that blocks any write while the current count is already over
the limit.
**Why:** A blanket over/under check makes an account that's already over stuck
permanently, since removing an item is itself a write, and every write would be blocked.
The cost is that every gated write site needs the same before/after comparison, not a
simpler single count check.

## Links

- [[00-Index]]
