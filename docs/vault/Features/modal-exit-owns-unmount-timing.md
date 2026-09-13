---
type: feature
status: shipped
---

# Modal exit owns its own unmount timing

Every dialog closes with the same animated exit, whether it's dismissed by Escape, the
backdrop, or a footer button.

**Code:** the shared modal component and its close hook

## What it does

1. A dialog's built-in chrome (Escape, backdrop, close button) already delays telling its
   parent to unmount until the exit animation finishes.
2. A footer action button routes through the same delayed-close hook instead of calling
   the parent's close handler directly, so it gets the identical animated exit.

## Decisions

### The modal delays its own unmount, and exposes that delay to callers

**Chosen:** The modal controls when its parent is told to unmount, and hands out a hook
that any footer button can call for the same delayed close.
**Over:** The default pattern where the parent unmounts immediately on a close callback.
**Why:** A parent-driven unmount removes the node before any exit animation can run, so
there's no way to animate it after the fact. The cost is that every dialog with its own
footer actions must remember to route them through the hook, or it silently reverts to
vanishing instead of animating out.

## Links

- [[00-Index]]
