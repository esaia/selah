---
type: feature
status: shipped
---

# Song languages are named by the operator, not the Bible's catalogue

A song can be sung in two languages at once, line-paired, even in a language the app holds
no scripture for.

**Code:** the song data model and its lyric-slide rendering

## What it does

1. A song carries its own language labels, set by whoever entered it.
2. Both languages' words render on the slide together, line-paired, the way a bilingual
   verse set would.

## Decisions

### Song language is a free label, not a row in the scripture catalogue

**Chosen:** A song names its own languages directly, independent of which languages the
Bible catalogue supports.
**Over:** Reusing the same fixed language set that scripture reading is built on.
**Why:** A congregation sings in languages the app may hold no scripture for at all, so
tying song language to the Bible's catalogue would make some songs impossible to enter.
The cost is two parallel ideas of "language" living in the codebase — one backed by
scripture data, one just an operator's label.

## Links

- [[00-Index]]
