/**
 * Pure freemium rules.
 *
 * Everything here is deliberately free of RevenueCat types and native calls so
 * the gating that decides whether a user sees a paywall or an ad can be unit
 * tested exhaustively — this is the code most likely to cost money or a store
 * rejection if it is wrong.
 */

/** Habits a free user may keep active at once. */
export const FREE_HABIT_LIMIT = 4;

/**
 * The RevenueCat entitlement one purchase grants.
 *
 * The lookup key says "remove ads" because that is what the store product is named, but the
 * entitlement carries the whole upgrade: no ads *and* no free-tier limits. Keeping the key as
 * RevenueCat has it matters more than the name reading perfectly here -- renaming an
 * entitlement means recreating it, and the SDK keys die with it.
 */
export const PRO_ENTITLEMENT = 'remove_ads';

/**
 * Why a paywall appeared.
 *
 * `themes` was here and is gone. It returned "Unlock everything, including
 * every feature added later." -- copy naming no themes, for a feature GridHabit
 * does not have: there is no theme picker anywhere in the app. A paid claim for
 * something that does not exist is the one thing this portfolio does not ship,
 * and it was also the only reason nothing ever raised, so it was invisible in
 * use as well as wrong.
 */
export type PaywallReason = 'habit-limit' | 'remove-ads' | 'export' | 'generic';

export function canAddHabit(activeHabitCount: number, isPremium: boolean): boolean {
  if (isPremium) return true;
  return activeHabitCount < FREE_HABIT_LIMIT;
}

export function habitSlotsRemaining(activeHabitCount: number, isPremium: boolean): number {
  if (isPremium) return Number.POSITIVE_INFINITY;
  return Math.max(0, FREE_HABIT_LIMIT - activeHabitCount);
}

/**
 * Suppresses the advert slot while capturing store screenshots.
 *
 * The banner reserves no space until an advert actually loads, so there is only
 * a few seconds between "still mounting" and "contaminated": measured on this
 * app, a frame is clean at 4s and carries the AdMob test creative -- with a
 * literal "Test mode" badge -- by 6s. Timing the shutter against that is a coin
 * flip, and a test-mode badge has reached App Store Connect before. The fix is
 * to stop the slot rendering rather than to race it.
 *
 * `__DEV__` is what makes this safe: it is false in every release build, so the
 * flag is inert in anything that ships no matter how the environment is set.
 * A capture build is a debug build by definition.
 */
export function isCaptureMode(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_CAPTURE_MODE === '1';
}

/**
 * Ads are shown only once we positively know the user is NOT premium. Rendering
 * ads while entitlements are still loading would flash an ad at a paying user
 * on every cold start — the single most damaging bug this feature can have.
 */
export function shouldShowAds({
  isPremium,
  isReady,
}: {
  isPremium: boolean;
  isReady: boolean;
}): boolean {
  if (isCaptureMode()) return false;
  return isReady && !isPremium;
}

export function paywallReasonFor(reason: PaywallReason): string {
  switch (reason) {
    case 'habit-limit':
      return `You have reached the ${FREE_HABIT_LIMIT}-habit limit on the free plan.`;
    case 'remove-ads':
      return 'Remove ads and keep GridHabit completely distraction-free.';
    case 'export':
      return 'Export your full history as CSV or JSON.';
    case 'generic':
    default:
      return 'Unlock unlimited habits, no ads, and everything else — forever.';
  }
}

/* ------------------------------------------------------------------- plans */

/** The subset of a RevenueCat package the UI actually needs. */
export interface PlanLike {
  identifier: string;
  priceString: string;
  price: number;
  /** `MONTH` | `YEAR` | `WEEK` | `DAY`, or null for a non-subscription. */
  periodUnit: string | null;
}

export interface PlanSummary {
  title: string;
  cadence: string;
  isLifetime: boolean;
  /** Whole-percent saving against a monthly baseline, or null when unknown. */
  savingsPercent: number | null;
}

function isLifetimeIdentifier(identifier: string): boolean {
  return /lifetime/i.test(identifier);
}

function isAnnualIdentifier(identifier: string, periodUnit: string | null): boolean {
  return periodUnit === 'YEAR' || /annual|yearly/i.test(identifier);
}

function isMonthlyIdentifier(identifier: string, periodUnit: string | null): boolean {
  return periodUnit === 'MONTH' || /monthly/i.test(identifier);
}

export function summarizePlan(plan: PlanLike, monthlyBaseline?: PlanLike): PlanSummary {
  if (isLifetimeIdentifier(plan.identifier)) {
    return {
      title: 'Lifetime',
      cadence: 'One-time payment',
      isLifetime: true,
      savingsPercent: null,
    };
  }

  if (isAnnualIdentifier(plan.identifier, plan.periodUnit)) {
    let savingsPercent: number | null = null;
    if (monthlyBaseline && monthlyBaseline.price > 0) {
      const yearOfMonthly = monthlyBaseline.price * 12;
      if (plan.price < yearOfMonthly) {
        savingsPercent = Math.round((1 - plan.price / yearOfMonthly) * 100);
      }
    }
    return {
      title: 'Yearly',
      cadence: 'Billed once a year',
      isLifetime: false,
      savingsPercent,
    };
  }

  if (isMonthlyIdentifier(plan.identifier, plan.periodUnit)) {
    return {
      title: 'Monthly',
      cadence: 'Billed monthly',
      isLifetime: false,
      savingsPercent: null,
    };
  }

  return {
    title: 'GridHabit Pro',
    cadence: plan.periodUnit ? `Billed every ${plan.periodUnit.toLowerCase()}` : 'One-time payment',
    isLifetime: plan.periodUnit === null,
    savingsPercent: null,
  };
}

const PLAN_RANK: ((plan: PlanLike) => boolean)[] = [
  (p) => isLifetimeIdentifier(p.identifier),
  (p) => isAnnualIdentifier(p.identifier, p.periodUnit),
  (p) => isMonthlyIdentifier(p.identifier, p.periodUnit),
];

function rankOf(plan: PlanLike): number {
  const index = PLAN_RANK.findIndex((matches) => matches(plan));
  return index === -1 ? PLAN_RANK.length : index;
}

/** Orders plans best-value first: lifetime, yearly, then monthly. */
export function sortPlans(plans: readonly PlanLike[]): PlanLike[] {
  return [...plans].sort((a, b) => rankOf(a) - rankOf(b) || a.price - b.price);
}
