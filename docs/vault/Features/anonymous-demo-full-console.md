---
type: feature
status: shipped
---

# The no-signup demo runs a real console, not a stripped-down sandbox

Trying the product before signing up drops a visitor into an actual Studio room, with only
the parts that need an owner turned off.

**Code:** the anonymous sign-in path, the Present popover's output gating, checkout gating

## What it does

1. "Try for free," gated behind a captcha, signs the visitor in anonymously and builds
   them a real trigger-backed Studio room.
2. Present's Screen/Stream/Stage links and checkout are gated off specifically, because an
   anonymous identity can't back a shareable output or a subscription.

## Decisions

### The demo is the real console with two things turned off, not a separate build

**Chosen:** An anonymous identity gets the actual Studio room, with only sharing an output
and paying disabled.
**Over:** Building a separate, simplified demo-mode UI that mimics the console without
being it.
**Why:** A separate demo surface would drift from the real product over time and double
what has to be maintained for the same experience. The cost is that guest rooms are real,
billable-shaped rows with no owner, which pushes cleanup and anonymization into a concern
the team has to handle separately.

## Links

- [[00-Index]]
