---
type: feature
status: shipped
---

# Selah's realtime transport

The console publishes a session's state once, and any output can join, reload, or arrive
late and still see the right slide.

**Code:** session publish/subscribe path, the persisted session-state row

## What it does

1. The console pushes a state update to a per-session realtime channel.
2. A joining or reloading output subscribes to that channel, but also reads a persisted
   row for the session so it isn't blank until the next push happens to arrive.

## Decisions

### One realtime channel plus a persisted row, not three separate transports

**Chosen:** A single realtime broadcast per session, backed by a row an output can read on
open.
**Over:** The prior mix of same-origin storage events, a vendor-specific bridge, and a
separate relay service, each covering one kind of output.
**Why:** The old mix tied one output's transport to a specific external tool's own event
system and a cross-origin workaround, so the console's reach was capped by whichever piece
was weakest. The cost is that every output now depends on one shared realtime
infrastructure rather than three independent, if uglier, paths.

## Links

- [[00-Index]]
