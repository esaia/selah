import { limitOf, roomFor, roomForList, type LimitKey } from './limits';
import type { PlanId } from './plans';

export const gatesEnforced = process.env.NEXT_PUBLIC_ENFORCE_GATES === '1';

export const planOf = (plan: string | null | undefined): PlanId => (plan === 'pro' ? 'pro' : 'free');

export const effectivePlan = (plan: string | null | undefined, isGuest = false): PlanId =>
  !gatesEnforced || isGuest ? 'pro' : planOf(plan);

export const allows = (
  plan: string | null | undefined,
  isGuest: boolean,
  key: LimitKey,
  current: number,
  adding = 1,
): boolean => roomFor(effectivePlan(plan, isGuest), key, current, adding);

export const ceiling = (plan: string | null | undefined, isGuest: boolean, key: LimitKey): number | null =>
  limitOf(effectivePlan(plan, isGuest), key);

export const allowsList = (
  plan: string | null | undefined,
  isGuest: boolean,
  key: LimitKey,
  wants: number,
  had: number,
): boolean => roomForList(effectivePlan(plan, isGuest), key, wants, had);
