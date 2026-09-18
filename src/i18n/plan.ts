import {
  isAnnualIdentifier,
  isLifetimeIdentifier,
  isMonthlyIdentifier,
  type PlanLike,
} from '@/monetization/entitlements';

import { t } from './index';

/**
 * The translated title and billing cadence for `plan`.
 *
 * Mirrors `summarizePlan`'s branching in `src/monetization/entitlements.ts`
 * exactly (same three identifier checks, same fallback), but builds
 * translated copy instead of the English literals that file's own tests
 * pin down -- this file is free to import `t()`, which lives behind
 * `expo-localization`, because it is not `src/monetization/` or `src/logic/`.
 */
export function planTitle(plan: PlanLike): string {
  if (isLifetimeIdentifier(plan.identifier)) return t('planLifetime');
  if (isAnnualIdentifier(plan.identifier, plan.periodUnit)) return t('planYearly');
  if (isMonthlyIdentifier(plan.identifier, plan.periodUnit)) return t('planMonthly');
  return t('gridHabitProTitle');
}

export function planCadence(plan: PlanLike): string {
  if (isLifetimeIdentifier(plan.identifier)) return t('planOneTimePayment');
  if (isAnnualIdentifier(plan.identifier, plan.periodUnit)) return t('planBilledYearly');
  if (isMonthlyIdentifier(plan.identifier, plan.periodUnit)) return t('planBilledMonthly');
  return plan.periodUnit
    ? t('planBilledEvery', { period: plan.periodUnit.toLowerCase() })
    : t('planOneTimePayment');
}
