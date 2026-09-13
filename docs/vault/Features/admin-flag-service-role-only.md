---
type: feature
status: shipped
---

# The admin flag can only be flipped by the service role

Whether an account can see the admin page isn't a value a signed-in user's own update path
can ever reach.

**Code:** the admin column on the profile row and the trigger pinning writes to it

## What it does

1. The admin flag lives on the same row as the rest of a profile.
2. A database trigger restricts writes to it to the service role, so no normal
   profile-update path — however it's reached — can set it.

## Decisions

### Privilege is pinned by a trigger, not left to row-level policy alone

**Chosen:** A trigger blocks any write to the admin flag that isn't made by the service
role.
**Over:** Relying on row-level security policy alone to keep a normal user from writing to
that column.
**Why:** Trusting policy alone leaves privilege escalation one misconfigured or
overlooked rule away from being reachable, where a trigger is a second, independent
backstop. The cost is an extra migration and trigger to maintain for what would otherwise
be a plain column.

## Links

- [[00-Index]]
