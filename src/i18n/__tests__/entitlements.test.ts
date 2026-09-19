import { paywallReasonKeyFor, type PaywallReason } from '@/monetization/entitlements';

import { t } from '..';
import { planCadence, planTitle } from '../plan';

// Mirrors `entitlements.test.ts`'s own content-matching guard: if the
// translated copy does not mention the thing the user just hit, the
// explanation is not an explanation. See that file for the history (a
// removed 'themes' reason once promised a feature GridHabit does not have).
describe('paywallReasonKeyFor / t', () => {
  const MUST_MENTION: Record<PaywallReason, RegExp> = {
    'habit-limit': /habit/i,
    'remove-ads': /ads?\b/i,
    export: /export/i,
    generic: /unlock|everything/i,
  };

  it.each(Object.keys(MUST_MENTION) as PaywallReason[])('%s explains itself in English', (reason) => {
    const text = t(paywallReasonKeyFor(reason), { n: 4 });
    expect(text).toMatch(MUST_MENTION[reason]);
  });
});

describe('planTitle / planCadence', () => {
  const lifetime = { identifier: '$rc_lifetime', priceString: '$39.99', price: 39.99, periodUnit: null };
  const annual = { identifier: '$rc_annual', priceString: '$19.99', price: 19.99, periodUnit: 'YEAR' };
  const monthly = { identifier: '$rc_monthly', priceString: '$2.99', price: 2.99, periodUnit: 'MONTH' };
  const other = { identifier: 'weird_plan', priceString: '$1.00', price: 1, periodUnit: 'WEEK' };

  it('labels a lifetime plan', () => {
    expect(planTitle(lifetime)).toBe('Lifetime');
    expect(planCadence(lifetime)).toBe('One-time payment');
  });

  it('labels an annual plan', () => {
    expect(planTitle(annual)).toBe('Yearly');
    expect(planCadence(annual)).toMatch(/year/i);
  });

  it('labels a monthly plan', () => {
    expect(planTitle(monthly)).toBe('Monthly');
    expect(planCadence(monthly)).toBe('Billed monthly');
  });

  it('degrades gracefully on an unknown identifier', () => {
    expect(planTitle(other).length).toBeGreaterThan(0);
    expect(planCadence(other)).toMatch(/week/i);
  });
});
