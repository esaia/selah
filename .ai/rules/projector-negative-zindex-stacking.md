---
globs:
  - "src/components/projector/**"
title: A negative z-index layer needs its own stacking context
---

A layer drawn behind its siblings with a negative z-index escapes to the nearest ancestor
stacking context if its parent isn't one itself — it renders behind the wrong element
instead of just behind its own siblings.

Give the parent `isolation: isolate` (or another stacking-context trigger) before relying
on a negative z-index inside it.
