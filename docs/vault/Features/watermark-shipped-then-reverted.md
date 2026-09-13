---
type: feature
status: reverted
---

# A free-tier watermark was shipped, then fully reverted

Free outputs briefly carried a mark identifying them as unpaid; it was pulled a day later
and has not returned.

**Code:** removed — the watermark component and its server-side plan resolution on the
output pages

## What it does

Not applicable — the feature no longer exists in the codebase.

## Decisions

### The mark was removed rather than fixed

**Chosen:** Reverting the watermark entirely, after it shipped and was working.
**Over:** Keeping a Free-only visual restriction on the outputs as a way to push upgrades.
**Why:** The product's promise was that Pro buys volume, not a difference in what a slide
looks like, and a watermark broke that promise the moment it existed. The cost was
throwing away a working, server-resolved feature — and any future idea for gating what an
output visually shows, rather than how much of it there is, should be treated as
previously tried and rejected, not unexplored.

## Links

- [[00-Index]]
