---
type: feature
status: shipped
---

# Playlists count against the free ceiling, libraries don't

A running order counts toward the free plan's limit; a music library or shelf never does.

**Code:** the plan-limit rules for songs/music, the music library model

## What it does

1. Creating a playlist (a service's running order) checks against the plan's ceiling.
2. Creating or filling a library does not, because a library is treated as a container
   rather than a countable unit.

## Decisions

### A library is a container and isn't counted; a playlist is, and is

**Chosen:** Only playlists are checked against the free ceiling; libraries and shelves are
unlimited.
**Over:** Counting libraries the same way, which is what made importing a ProPresenter
bundle — which creates a shelf — collide with the ceiling for the wrong reason.
**Why:** A shelf is just somewhere songs live, not a service-facing thing worth capping,
so counting it punished an operator for organizing rather than for running a service. The
cost is that two things an operator might expect to be capped alike now follow different
rules, which is easy to misremember later.

## Links

- [[00-Index]]
