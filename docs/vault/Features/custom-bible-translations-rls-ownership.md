---
type: feature
status: shipped
---

# Operator-supplied Bible translations are read with the operator's own access

A church that uploads its own translation gets its rows read under its own permissions,
not a service-level bypass with a manual ownership check.

**Code:** the custom-translation table and its route, sharing the same chapter-shape
contract as the mirrored catalogue

## What it does

1. A church's uploaded translation is stored in its own rows, alongside the mirrored
   catalogue's table but never mixed into it.
2. Reading it uses the caller's own client, so ownership is enforced by row-level policy
   rather than logic in the route.

## Decisions

### Ownership is a database policy, not a check the route remembers

**Chosen:** Custom-translation reads go through the caller's own client, so the database's
row-level policy is what decides access.
**Over:** Reading with the service-role client and writing an explicit ownership check in
the route.
**Why:** A check written per-route is a check that can be forgotten on the next route that
touches the same data, where a policy on the table can't be skipped by accident. The cost
is a second table that must be kept schema-identical to the mirrored one by hand, since
they share one chapter-reading contract.

## Links

- [[00-Index]]
