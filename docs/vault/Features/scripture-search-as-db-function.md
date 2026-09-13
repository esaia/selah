---
type: feature
status: shipped
---

# Scripture search runs in the database

Finding a verse by what it says, rather than by reference, doesn't pull chapters over the
wire to filter them.

**Code:** the Bible search path over the scripture table

## What it does

1. A search term is matched against the stored verse rows by a database-side function.
2. Only matching verses come back — the API route never receives full chapters to filter
   itself.

## Decisions

### Matching happens in the database, not the route

**Chosen:** Text matching is a database function operating directly on the stored verse
rows.
**Over:** Fetching full chapters into the API route and filtering them there in
application code.
**Why:** Filtering in the route would mean pulling entire chapters over the wire just to
throw most of them away, for every search. The cost is that search logic is now coupled to
the on-disk shape of the verse rows, and has to be reworked if that shape ever changes.

## Links

- [[00-Index]]
