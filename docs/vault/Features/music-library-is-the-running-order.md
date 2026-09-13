---
type: feature
status: shipped
---

# Music library is the running order

An operator drags tracks straight from a library onto the rail — there's no separate
service queue to copy them into first.

**Code:** Audio tab library CRUD and rail playback

## What it does

1. A library is opened on the rail.
2. Dragging a track there both orders it for playback and is the only ordering that
   exists — nothing separate is being built up alongside it.

## Decisions

### Library and running order are the same structure

**Chosen:** A library, once opened on the rail, is itself the played order.
**Over:** Keeping the library as a separate catalogue an operator copies tracks out of into
a per-service queue.
**Why:** Which of the two structures a track currently belonged to was exactly the kind of
bookkeeping an operator had to work out under time pressure, so collapsing them removes a
decision mid-service. The cost is that a queue can no longer differ from any library's own
file structure — reordering on the rail reorders the library itself.

## Links

- [[00-Index]]
