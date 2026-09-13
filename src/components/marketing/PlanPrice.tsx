import { CountingPrice } from '@/components/billing/CountingPrice';
import type { Plan } from '@/lib/billing/plans';

export const PlanPrice = ({
  plan,
  size,
  display,
}: {
  plan: Plan;
  size: string;
  display: string;
}) => (
  <>
    <p className="flex items-baseline gap-2">
      <CountingPrice value={plan.price} className={`${display} ${size}`} />

      <span key={plan.cadence} className="site-price-in text-sm text-site-faint">
        {plan.cadence}
      </span>
    </p>

    <p className="mt-1.5 text-[13px] leading-4 text-site-faint">
      <span key={plan.permonth ?? 'none'} className="site-price-in">
        {plan.permonth ? `Save ${plan.saving}. That's ${plan.permonth} a month.` : '\u00A0'}
      </span>
    </p>
  </>
);
