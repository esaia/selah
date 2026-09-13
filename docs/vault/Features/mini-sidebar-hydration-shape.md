---
type: feature
status: shipped
---

# The mini sidebar's shape waits for hydration; its width doesn't

The sidebar's width is stamped before first paint to avoid layout shift, but whether it
renders as the mini or full tree is left unresolved until hydration.

**Code:** the mini/full sidebar tree and the pre-hydration width stamping on the page root

## What it does

1. Width is written to the page root before paint, the same way the output rail already
   does, so the layout doesn't jump once React takes over.
2. Which content tree renders — mini or full — is decided only after hydration, since
   collapsing to mini swaps the whole tree rather than narrowing it.

## Decisions

### Shape is decided at hydration; width is decided before it

**Chosen:** Width is stamped pre-hydration; the mini-vs-full choice waits until hydration
resolves it.
**Over:** Stamping both width and shape before hydration, guessed server-side.
**Why:** Guessing the shape server-side risks rendering one shape's markup at the other
shape's width, which is a worse mismatch than a brief flash. The cost is a possible
first-paint flash of the wrong sidebar shape on slow hydration, traded for not rendering
mismatched markup.

## Links

- [[00-Index]]
