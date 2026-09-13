---
type: feature
status: shipped
---

# The pricing page reads from the same limits table the console does

What the marketing site says a plan includes is guaranteed to match what the console
actually enforces.

**Code:** the shared plan-limits data module

## What it does

1. The console's own ceiling data is read into a shared module.
2. The public pricing page renders its table from that same module rather than its own
   copy.

## Decisions

### Pricing copy is generated from the console's limit data, not hand-written

**Chosen:** The pricing table renders from the same limits module the console reads when
telling an operator they've hit a ceiling.
**Over:** Maintaining the pricing page's numbers as separate marketing copy, updated by
hand alongside the console's.
**Why:** Two independently maintained copies of the same numbers will eventually drift,
and a pricing page that oversells or undersells a plan is a worse failure than an ugly
table. The cost is that marketing copy is now constrained to whatever shape the console's
own limit data takes, rather than being free-form.

## Links

- [[00-Index]]
