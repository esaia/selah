---
type: feature
status: shipped
---

# Operator-drawn layouts are built in relative units, and reused for stream straps

An operator can draw their own slide layout, and the same editor and canvas draw the
stream's straps too.

**Code:** the custom-layout editor and its canvas, reused by the stream's strap editor

## What it does

1. Every box an operator places is stored as a fraction of the frame, never a pixel
   position.
2. The stream's strap editor reuses that same canvas and editor rather than being its own
   tool, adding a bright/dark stand-in behind boxes since the stream composites over live
   video.

## Decisions

### Boxes are fractions of the frame, never pixels

**Chosen:** Every custom-layout box is stored and rendered as a fraction of the frame.
**Over:** Storing absolute pixel positions sized to one output's resolution.
**Why:** A layout drawn against one output's frame has to still make sense on a
differently-sized one, which pixel positions can't guarantee. The cost is that any new box
type must be authored in relative units from the start, or it won't scale correctly
alongside the rest.

### The stream reuses the same editor instead of getting its own

**Chosen:** The stream's straps are built with the identical canvas and editor used for
projector layouts, with a stand-in composited behind boxes to preview against video.
**Over:** A second, purpose-built tool for laying out straps over a video feed.
**Why:** Building a second tool would double the surface that needs maintaining for what
is fundamentally the same box-placement problem. The cost is that any future box type has
to be tested against both the wall's dark background and the stream's video-composite
case, not just one.

## Links

- [[00-Index]]
