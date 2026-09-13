---
type: feature
status: shipped
---

# Pasting never republishes the live slide

Pasting lyric slides right after the one currently live doesn't change what the wall is
showing.

**Code:** the lyrics-block paste path

## What it does

1. A paste inserts the new slides and re-indexes the live pointer only when the paste
   actually shifts its position.
2. It never treats the paste itself as a reason to push a new slide to the outputs, even
   when the naive index math after the paste would look like an intentional advance.

## Decisions

### Paste is inert on the outputs, even right after the live slide

**Chosen:** A paste that lands immediately after the currently-live slide never republishes
anything.
**Over:** Letting a paste's index shift ripple into the live pointer the same way any
other reorder would.
**Why:** The original behavior silently swapped what the congregation saw mid-service
whenever a paste happened to land right after the live slide, which is a far worse outcome
than nothing happening. The cost is that pasting there can look like nothing happened if
the operator actually expected the new slide to go live.

## Links

- [[00-Index]]
