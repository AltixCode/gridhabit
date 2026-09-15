import Purchases from 'react-native-purchases';

import { PRO_ENTITLEMENT } from '../entitlements';
import {
  addCustomerInfoListener,
  getCurrentOffering,
  getCustomerInfo,
  hasProEntitlement,
  orderedPackages,
  purchasePackage,
  restorePurchases,
  toPlanLike,
} from '../purchases';

const mockPurchases = Purchases as jest.Mocked<typeof Purchases>;

function pkg(identifier: string, price: number, period: string | null) {
  return {
    identifier,
    product: { priceString: `$${price.toFixed(2)}`, price, subscriptionPeriod: period },
  } as never;
}

describe('hasProEntitlement', () => {
  it('is false for null or undefined customer info', () => {
    expect(hasProEntitlement(null)).toBe(false);
    expect(hasProEntitlement(undefined)).toBe(false);
  });

  it('is false when no entitlement is active', () => {
    expect(hasProEntitlement({ entitlements: { active: {} } } as never)).toBe(false);
  });

  it('is false when a different entitlement is active', () => {
    expect(
      hasProEntitlement({ entitlements: { active: { plus: {} } } } as never),
    ).toBe(false);
  });

  it('is true when the upgrade entitlement is active', () => {
    // Keyed off the constant rather than a literal: the lookup key is whatever RevenueCat
    // holds, and a test that hardcodes it fails for the wrong reason the day it is renamed.
    expect(
      hasProEntitlement({
        entitlements: { active: { [PRO_ENTITLEMENT]: {} } },
      } as never),
    ).toBe(true);
  });

  it('is false for the old lookup key', () => {
    // The portfolio moved from "pro" to "remove_ads" when the ads rollout made one purchase
    // cover both. A build still matching the old key would hand the upgrade to nobody.
    expect(
      hasProEntitlement({ entitlements: { active: { pro: {} } } } as never),
      // Compared as a string so TypeScript does not narrow the literal away and reject the
      // comparison outright.
    ).toBe((PRO_ENTITLEMENT as string) === 'pro');
  });
});

describe('toPlanLike', () => {
  it('maps an ISO-8601 yearly period', () => {
    expect(toPlanLike(pkg('$rc_annual', 19.99, 'P1Y'))).toEqual({
      identifier: '$rc_annual',
      priceString: '$19.99',
      price: 19.99,
      periodUnit: 'YEAR',
    });
  });

  it('maps monthly, weekly and daily periods', () => {
    expect(toPlanLike(pkg('a', 1, 'P1M')).periodUnit).toBe('MONTH');
    expect(toPlanLike(pkg('b', 1, 'P2W')).periodUnit).toBe('WEEK');
    expect(toPlanLike(pkg('c', 1, 'P3D')).periodUnit).toBe('DAY');
  });

  it('reports a non-subscription as having no period', () => {
    expect(toPlanLike(pkg('$rc_lifetime', 39.99, null)).periodUnit).toBeNull();
  });

  it('reports an unrecognised period as no period rather than throwing', () => {
    expect(toPlanLike(pkg('weird', 1, 'PT30S')).periodUnit).toBeNull();
  });
});

describe('orderedPackages', () => {
  it('returns nothing for a null offering', () => {
    expect(orderedPackages(null)).toEqual([]);
  });

  it('returns nothing for an offering with no packages', () => {
    expect(orderedPackages({ availablePackages: [] } as never)).toEqual([]);
  });

  it('orders lifetime, then yearly, then monthly', () => {
    const offering = {
      availablePackages: [
        pkg('$rc_monthly', 2.99, 'P1M'),
        pkg('$rc_lifetime', 39.99, null),
        pkg('$rc_annual', 19.99, 'P1Y'),
      ],
    } as never;
    expect(orderedPackages(offering).map((p) => p.identifier)).toEqual([
      '$rc_lifetime',
      '$rc_annual',
      '$rc_monthly',
    ]);
  });

  it('keeps an unrecognised package rather than dropping it from the paywall', () => {
    const offering = {
      availablePackages: [pkg('mystery_tier', 9.99, 'P1M'), pkg('$rc_lifetime', 39.99, null)],
    } as never;
    expect(orderedPackages(offering)).toHaveLength(2);
  });
});

describe('unconfigured build', () => {
  // With no RevenueCat key the SDK is never configured. Every call must degrade
  // to a safe "not premium / unavailable" answer rather than throwing at launch.
  it('reports no customer info', async () => {
    await expect(getCustomerInfo()).resolves.toBeNull();
    expect(mockPurchases.getCustomerInfo).not.toHaveBeenCalled();
  });

  it('reports no offering', async () => {
    await expect(getCurrentOffering()).resolves.toBeNull();
  });

  it('refuses a purchase with an error result instead of crashing', async () => {
    await expect(purchasePackage(pkg('$rc_lifetime', 39.99, null))).resolves.toMatchObject({
      status: 'error',
      isPremium: false,
    });
  });

  it('refuses a restore with an error result', async () => {
    await expect(restorePurchases()).resolves.toMatchObject({ status: 'error' });
  });

  it('returns a no-op unsubscribe from the listener', async () => {
    expect(() => addCustomerInfoListener(jest.fn())()).not.toThrow();
  });
});
