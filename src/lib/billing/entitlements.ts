import { PLANS, type Feature, type PlanId } from './plans';

/**
 * Gates are defined but not enforced. Flip NEXT_PUBLIC_ENFORCE_GATES to 1 once
 * the tiers are settled and every `can()` call site starts biting at once.
 */
export const gatesEnforced = process.env.NEXT_PUBLIC_ENFORCE_GATES === '1';

export const planOf = (plan: string | null | undefined): PlanId => (plan === 'pro' ? 'pro' : 'free');

export const can = (plan: string | null | undefined, feature: Feature): boolean =>
  !gatesEnforced || PLANS[planOf(plan)].features.includes(feature);
