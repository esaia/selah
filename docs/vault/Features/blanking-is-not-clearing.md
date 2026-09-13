---
type: feature
status: shipped
---

# Blanking an output is not clearing it

Toggling an output dark doesn't drop its connection or lose the run underneath it.

**Code:** the per-output blank toggle (projector/stage/stream) and the global name-card
settings

## What it does

1. Blanking an output hides what it shows.
2. The slide, the timer's run, and the output's connection all keep going underneath —
   unblanking picks the run back up exactly where it was.

## Decisions

### Blank is a display state, clear is a data state

**Chosen:** Blanking only changes what's visible; it never touches the underlying slide or
timer.
**Over:** Treating "off" as a single state that also empties the slide, the way clearing
does.
**Why:** An operator reloading or toggling an output mid-service must not lose the run or
drop the stream connection just because the picture went dark. The cost is that the
codebase now carries two distinct concepts of "off" that have to stay distinct rather than
collapsing into one boolean.

## Links

- [[00-Index]]
