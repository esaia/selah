---
type: feature
status: shipped
---

# Annual billing is a separate product, not a coupon

Pro billed yearly and Pro billed monthly are two different products on the payment
provider, not one product with a discount applied at checkout.

**Code:** the fixed per-rung, per-cadence product ids and the checkout route that resolves
them

## What it does

1. Checkout resolves which fixed product id to use from the chosen rung and cadence.
2. A subscription's cadence is fixed for its lifetime by which product it was created on;
   a rung with no product for the requested cadence fails the checkout rather than
   silently substituting the other one's price.

## Decisions

### Cadence is which product a subscription was created on, not a coupon flag

**Chosen:** Six fixed products, one per rung times cadence, so cadence is baked into which
product was purchased.
**Over:** One product per rung, with an annual coupon applied at checkout to produce the
discounted price.
**Why:** A coupon-based cadence is a mutable, spoofable fact about a subscription rather
than a fixed one tied to what was actually bought. The cost is an extra product to create
and maintain in the payment provider for every price point that exists.

## Links

- [[00-Index]]
