---
type: feature
status: shipped
---

# Founding-seat pricing is stamped once, never recounted

An early subscriber's discount rung is fixed the moment they claim it, and can't move
backwards later.

**Code:** the founding-seat claim path and its stored column

## What it does

1. Claiming a seat writes a rung number to the subscriber's row at that moment.
2. Nothing afterwards recomputes that rung — it's read back exactly as stamped.

## Decisions

### The rung is a stamped number, not a live count of paying subscribers

**Chosen:** A subscriber's founding rung is written once at claim time and never
recalculated.
**Over:** Deriving the current rung from how many subscribers are presently paying.
**Why:** A live count walks backwards every time someone cancels, which reads as broken
pricing and is gameable by resubscribing to land a better rung. The cost is an extra
column to maintain, in exchange for a count that can only ever go up.

## Links

- [[00-Index]]
