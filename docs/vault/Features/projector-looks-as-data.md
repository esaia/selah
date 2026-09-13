---
type: feature
status: shipped
---

# Projector looks are picked by seeing them

An operator chooses the projector's layout from a set of previews, not a name in a
dropdown.

**Code:** the projector-look table (rows plus CSS) and the components that render from it
— the projector, the console's preview, and the picker's tiles

**Tests:** covers the look table

## What it does

1. A layout is a row in a shared table describing its structure and its CSS.
2. The projector, the console's live preview, and the picker's settings tiles all render
   from that same table rather than each having their own layout implementation.

## Decisions

### One declarative table of looks feeds three surfaces

**Chosen:** Layouts live as data — a table of rows and CSS — that every consumer reads
from.
**Over:** Three separate hard-coded implementations, one per surface, kept in sync by
hand.
**Why:** The name-card layout already worked this way, and diverging from it would mean
every new layout has to be built correctly in three places instead of one. The cost is
that a layout is now data plus a CSS contract rather than a component, so adding one means
extending both correctly rather than just writing markup.

## Links

- [[00-Index]]
