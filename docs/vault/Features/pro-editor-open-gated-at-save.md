---
type: feature
status: shipped
---

# The Pro layout editor opens for anyone, and gates only at Save

A visitor with no account can open the custom-layout editor and draw a real layout — the
paywall only appears when they try to keep it.

**Code:** the account/editor gating check

## What it does

1. The custom-layout editor opens and works fully for a signed-out visitor.
2. Saving is the one action that checks the plan, and prompts to upgrade only at that
   point.

## Decisions

### Gate at Save, not at open

**Chosen:** The editor is unrestricted to try; only saving is checked against the plan.
**Over:** Blocking access to the editor itself until the visitor is on a paid plan.
**Why:** Blocking at open means a prospect can never actually try the feature they'd be
paying for, which is a worse sales motion than a paywall they hit after they're already
convinced. The cost is the editor has to behave like the real thing all the way through,
then degrade gracefully into a paywall nudge instead of a real save.

## Links

- [[00-Index]]
