import {
  FREE_HABIT_LIMIT,
  canAddHabit,
  habitSlotsRemaining,
  paywallReasonFor,
  shouldShowAds,
  sortPlans,
  summarizePlan,
  type PlanLike,
  type PaywallReason,
} from '../entitlements';

describe('canAddHabit', () => {
  it('allows a free user below the limit', () => {
    expect(canAddHabit(0, false)).toBe(true);
    expect(canAddHabit(FREE_HABIT_LIMIT - 1, false)).toBe(true);
  });

  it('blocks a free user at exactly the limit — the paywall trigger', () => {
    expect(canAddHabit(FREE_HABIT_LIMIT, false)).toBe(false);
  });

  it('blocks a free user above the limit (e.g. after a lapsed subscription)', () => {
    expect(canAddHabit(FREE_HABIT_LIMIT + 3, false)).toBe(false);
  });

  it('always allows a premium user', () => {
    expect(canAddHabit(FREE_HABIT_LIMIT, true)).toBe(true);
    expect(canAddHabit(500, true)).toBe(true);
  });
});

describe('habitSlotsRemaining', () => {
  it('counts down to zero and never goes negative', () => {
    expect(habitSlotsRemaining(0, false)).toBe(FREE_HABIT_LIMIT);
    expect(habitSlotsRemaining(FREE_HABIT_LIMIT, false)).toBe(0);
    expect(habitSlotsRemaining(FREE_HABIT_LIMIT + 5, false)).toBe(0);
  });

  it('is Infinity for premium', () => {
    expect(habitSlotsRemaining(3, true)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('shouldShowAds', () => {
  it('shows ads to a free user', () => {
    expect(shouldShowAds({ isPremium: false, isReady: true })).toBe(true);
  });

  it('never shows ads to a premium user — the core promise of the upgrade', () => {
    expect(shouldShowAds({ isPremium: true, isReady: true })).toBe(false);
  });

  it('shows nothing until entitlements have resolved, to avoid a flash of ads', () => {
    expect(shouldShowAds({ isPremium: false, isReady: false })).toBe(false);
  });
});

describe('paywallReasonFor', () => {
  it('names the habit limit', () => {
    expect(paywallReasonFor('habit-limit')).toMatch(/habit/i);
  });

  it('names ad removal', () => {
    expect(paywallReasonFor('remove-ads')).toMatch(/ad/i);
  });

  it('falls back to a generic pitch', () => {
    expect(paywallReasonFor('generic')).toEqual(expect.any(String));
  });
});

describe('summarizePlan', () => {
  const lifetime: PlanLike = {
    identifier: '$rc_lifetime',
    priceString: '$39.99',
    price: 39.99,
    periodUnit: null,
  };
  const annual: PlanLike = {
    identifier: '$rc_annual',
    priceString: '$19.99',
    price: 19.99,
    periodUnit: 'YEAR',
  };
  const monthly: PlanLike = {
    identifier: '$rc_monthly',
    priceString: '$2.99',
    price: 2.99,
    periodUnit: 'MONTH',
  };

  it('labels a lifetime plan and marks it as one-time', () => {
    expect(summarizePlan(lifetime)).toMatchObject({
      title: 'Lifetime',
      isLifetime: true,
      cadence: 'One-time payment',
    });
  });

  it('labels an annual plan with its per-month equivalent', () => {
    const summary = summarizePlan(annual);
    expect(summary.title).toBe('Yearly');
    expect(summary.isLifetime).toBe(false);
    expect(summary.cadence).toMatch(/year/i);
  });

  it('labels a monthly plan', () => {
    expect(summarizePlan(monthly)).toMatchObject({
      title: 'Monthly',
      cadence: 'Billed monthly',
    });
  });

  it('computes savings of an annual plan against a monthly one', () => {
    const summary = summarizePlan(annual, monthly);
    // 12 x 2.99 = 35.88 vs 19.99 -> ~44% saved.
    expect(summary.savingsPercent).toBe(44);
  });

  it('omits savings when there is nothing to compare against', () => {
    expect(summarizePlan(annual).savingsPercent).toBeNull();
  });

  it('omits savings when the annual plan is not actually cheaper', () => {
    expect(
      summarizePlan({ ...annual, price: 40 }, monthly).savingsPercent,
    ).toBeNull();
  });

  it('degrades gracefully on an unknown identifier', () => {
    const summary = summarizePlan({
      identifier: 'weird_plan',
      priceString: '$1.00',
      price: 1,
      periodUnit: null,
    });
    expect(summary.title).toEqual(expect.any(String));
    expect(summary.title.length).toBeGreaterThan(0);
  });
});

describe('sortPlans', () => {
  it('puts lifetime first, then yearly, then monthly — best value leads', () => {
    const plans: PlanLike[] = [
      { identifier: '$rc_monthly', priceString: '', price: 2.99, periodUnit: 'MONTH' },
      { identifier: '$rc_lifetime', priceString: '', price: 39.99, periodUnit: null },
      { identifier: '$rc_annual', priceString: '', price: 19.99, periodUnit: 'YEAR' },
    ];
    expect(sortPlans(plans).map((p) => p.identifier)).toEqual([
      '$rc_lifetime',
      '$rc_annual',
      '$rc_monthly',
    ]);
  });

  it('does not mutate the input', () => {
    const plans: PlanLike[] = [
      { identifier: '$rc_monthly', priceString: '', price: 1, periodUnit: 'MONTH' },
      { identifier: '$rc_lifetime', priceString: '', price: 2, periodUnit: null },
    ];
    const copy = [...plans];
    sortPlans(plans);
    expect(plans).toEqual(copy);
  });
});

describe('paywall reason copy', () => {
  // A reason exists to explain why THIS paywall appeared. If its copy does not
  // mention the thing the user just hit, the explanation is not an explanation.
  //
  // 'themes' used to return "Unlock everything, including every feature added
  // later." -- copy that mentions no themes, for a feature GridHabit does not
  // have: there is no theme picker anywhere in the app. It was a paid claim for
  // something that did not exist, which is the one thing this portfolio does
  // not ship. It was also the only reason nothing ever raised, so it was
  // invisible in use as well as wrong.
  const MUST_MENTION: Record<PaywallReason, RegExp> = {
    'habit-limit': /habit/i,
    'remove-ads': /ads?\b/i,
    export: /export/i,
    generic: /unlock|everything/i,
  };

  it.each(Object.keys(MUST_MENTION) as PaywallReason[])(
    '%s explains itself',
    (reason) => {
      const pattern = MUST_MENTION[reason];
      expect(pattern).toBeDefined();
      expect(paywallReasonFor(reason)).toMatch(pattern as RegExp);
    },
  );

  it('promises nothing open-ended about features that do not exist yet', () => {
    for (const reason of Object.keys(MUST_MENTION) as PaywallReason[]) {
      expect(paywallReasonFor(reason)).not.toMatch(/added later|future|coming soon/i);
    }
  });
});

describe('capture mode', () => {
  // GridHabit was one of only two apps in the portfolio that never implemented
  // this gate, so the EXPO_PUBLIC_CAPTURE_MODE flag device-pass.sh exports did
  // nothing here and its store screenshots carried a Google TEST advert with a
  // literal "Test mode" badge across the bottom -- a third party's creative in
  // our shelf space, advertising that the build is not a release one.
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_CAPTURE_MODE;
  });

  it('suppresses ads while a store screenshot is being captured', () => {
    process.env.EXPO_PUBLIC_CAPTURE_MODE = '1';
    expect(shouldShowAds({ isPremium: false, isReady: true })).toBe(false);
  });

  it('shows ads normally when the flag is absent', () => {
    expect(shouldShowAds({ isPremium: false, isReady: true })).toBe(true);
  });

  it('ignores any value other than exactly "1"', () => {
    process.env.EXPO_PUBLIC_CAPTURE_MODE = 'true';
    expect(shouldShowAds({ isPremium: false, isReady: true })).toBe(true);
  });
});
