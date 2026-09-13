---
type: feature
status: shipped
---

# Guests are treated as Pro, not given a raised Free ceiling

An unauthenticated guest session is unconditionally gated as if it were on the top plan,
on both the client and the server, regardless of whether gates are otherwise enforced.

**Code:** the client's effective-plan resolution and the server's plan-ceiling function

## What it does

1. A guest session is checked as Pro in the client's gating logic.
2. The server's own ceiling function makes the identical call independently, so the two
   never have to be reconciled against each other by a third source.

## Decisions

### Guest is unconditionally Pro, not Free-with-a-higher-number

**Chosen:** Both the client and the server treat a guest as Pro outright.
**Over:** Lifting only the Free ceiling's numbers up to Pro's for a guest, while still
calling them "Free."
**Why:** A guest can never produce a shareable output regardless of plan, so a raised
Free ceiling would still surface upgrade prompts a guest has no way to act on. The cost is
that "guest always means unlimited" now has to be kept true independently in two places,
widening the surface where the two could quietly drift apart.

## Links

- [[00-Index]]
