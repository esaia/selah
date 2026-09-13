---
type: feature
status: shipped
---

# Output display chrome lives on the machine, not the session

Whether an output is flipped or fullscreen is remembered by the browser showing it, not by
the running service.

**Code:** the output pages' flip/fullscreen controls

## What it does

1. An operator sets flip or fullscreen directly on an output page.
2. That choice is saved to that browser only, and never sent over the channel to other
   viewers of the same session.

## Decisions

### Flip and fullscreen are per-browser state, not per-session state

**Chosen:** Flip and fullscreen live in the browser's own storage, scoped to that machine.
**Over:** Publishing them as part of the session so any output showing that session
inherits the same setting.
**Why:** Whether a screen is rear-projected or a projector hangs upside-down is a property
of that room's hardware, not of the service currently running on it. The cost is that the
same output opened on a different machine starts over with no flip or fullscreen state —
it's deliberately not portable.

## Links

- [[00-Index]]
