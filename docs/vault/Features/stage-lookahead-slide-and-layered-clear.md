---
type: feature
status: shipped
---

# Stage look-ahead slide and layered Clear

The stage screen shows what's coming up next, not just what's live, and Clear no longer
wipes everything at once.

**Code:** next-slide field alongside the live show payload, the pure slide-picking
function, the layer-by-layer Clear control

## What it does

1. The console computes the next slide the same way it computes the live one.
2. Both are published together, so a stage monitor joining mid-service sees "up next"
   immediately rather than waiting for the next advance.
3. Clear acts on one layer — slide, timer, or bed — instead of one button for all three.

## Decisions

### Next slide is published state, not derived client-side

**Chosen:** The look-ahead slide rides in the payload as a sibling of the live one, built
by the same pure function.
**Over:** Having each output work out "what's next" itself from the running order it
already has.
**Why:** A monitor that joins or reloads mid-service has no history to derive from, so
client-side derivation would leave it blank until the next advance. The cost is an extra
piece of state to keep in sync on every publish, not just at advance time.

### Clear is three buttons, not one

**Chosen:** Slide, timer, and bed each clear independently.
**Over:** A single Clear that empties all three layers at once.
**Why:** The three layers already have three different owners in a service, so one button
could only ever mean "all of it," which is rarely what's wanted. The cost is three
affordances an operator has to learn instead of one.

## Links

- [[00-Index]]
