---
type: feature
status: shipped
---

# Lyric search keys are checked before the server fetches them

Finding a song's lyrics from an external source can't be turned into a way to make the
server fetch an arbitrary address.

**Code:** the lyrics-fetch module's host allowlist and key-validity check

## What it does

1. A search returns candidates whose keys (often full URLs) came from the browser.
2. Before fetching one, the server checks the key against a fixed per-source list of
   allowed hosts, and only proceeds if it matches.

## Decisions

### A search key is untrusted the moment it's round-tripped through the browser

**Chosen:** Validate a candidate's key against a per-source host allowlist before the
server fetches it.
**Over:** Treating the key as an opaque value the server can trust because the server
itself produced it earlier in the same request.
**Why:** Once a value has passed through the client, nothing stops a request from handing
back a doctored one, which without a check would let the server be made to fetch an
arbitrary host on the caller's behalf. The cost is that every new lyric source needs its
own allowlist entry, or a non-URL fallback rule, before it can be wired in.

## Links

- [[00-Index]]
