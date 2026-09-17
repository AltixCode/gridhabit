import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

import { PRO_ENTITLEMENT, isCaptureMode, sortPlans, type PlanLike } from './entitlements';
import { isPurchasesConfigured, revenueCatApiKey } from './config';

/**
 * RevenueCat wrapper.
 *
 * Everything the app calls goes through here so that:
 *  - a build with no RevenueCat key (a fresh clone, a CI smoke build) still
 *    runs, simply reporting "not premium" rather than crashing at launch;
 *  - entitlement checking lives in exactly one place.
 */

let configured = false;

export async function configurePurchases(): Promise<void> {
  if (configured || !isPurchasesConfigured || !revenueCatApiKey) return;
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
  await Purchases.configure({ apiKey: revenueCatApiKey });
  configured = true;
}

/** True when the customer holds the `pro` entitlement. */
export function hasProEntitlement(info: CustomerInfo | null | undefined): boolean {
  if (!info) return false;
  return info.entitlements.active[PRO_ENTITLEMENT] !== undefined;
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    // Offline or a transient RevenueCat outage. The cached entitlement in the
    // store stays authoritative; we never downgrade a paying user on an error.
    return null;
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

/** Adapts a RevenueCat package to the pure `PlanLike` shape the UI reasons about. */
export function toPlanLike(pkg: PurchasesPackage): PlanLike {
  return {
    identifier: pkg.identifier,
    priceString: pkg.product.priceString,
    price: pkg.product.price,
    periodUnit: pkg.product.subscriptionPeriod
      ? periodUnitOf(pkg.product.subscriptionPeriod)
      : null,
  };
}

/** Parses an ISO-8601 duration such as `P1Y` / `P1M` into a unit token. */
function periodUnitOf(period: string): string | null {
  if (/Y$/.test(period)) return 'YEAR';
  if (/M$/.test(period)) return 'MONTH';
  if (/W$/.test(period)) return 'WEEK';
  if (/D$/.test(period)) return 'DAY';
  return null;
}

/**
 * The package list a store screenshot shows when the simulator has no store.
 *
 * A StoreKit configuration cannot reach this pipeline: Xcode applies one by
 * syncing it to the device as part of running a scheme, via
 * `-[DVTDevice handleStoreKitConfigurationSyncForBundleID:configurationFilePath:]`,
 * and `xcrun simctl` has no equivalent. So an `expo run:ios` + `simctl launch`
 * build never receives a product catalogue and the paywall renders its
 * unavailable state -- which is what the IAP review screenshot Apple sees then
 * shows, in place of a buy button.
 *
 * This app lists several plans rather than one, so the fallback is a list of
 * one: the lifetime purchase at the price in `scripts/iap.json`, read from the
 * App Store Connect price schedule.
 *
 * `__DEV__` is what makes it safe -- false in every release build, so a
 * fabricated package cannot reach anyone who could buy it.
 */
function capturePriceFallback(): PurchasesPackage[] {
  const price = process.env.EXPO_PUBLIC_CAPTURE_PRICE;
  if (!isCaptureMode() || !price) return [];
  const amount = Number(price.replace(/[^0-9.]/g, '')) || 0;
  return [
    {
      identifier: 'lifetime',
      packageType: 'LIFETIME',
      offeringIdentifier: 'capture',
      product: {
        identifier: 'capture.lifetime',
        priceString: price.startsWith('$') ? price : `$${price}`,
        price: amount,
        currencyCode: 'USD',
      },
    } as unknown as PurchasesPackage,
  ];
}

/** Offering packages ordered best-value first. */
export function orderedPackages(offering: PurchasesOffering | null): PurchasesPackage[] {
  if (!offering) return capturePriceFallback();
  const byId = new Map(offering.availablePackages.map((p) => [p.identifier, p]));
  const ordered = sortPlans(offering.availablePackages.map(toPlanLike))
    .map((plan) => byId.get(plan.identifier))
    .filter((p): p is PurchasesPackage => p !== undefined);
  return ordered.length > 0 ? ordered : capturePriceFallback();
}

export interface PurchaseResult {
  status: 'purchased' | 'cancelled' | 'error';
  isPremium: boolean;
  message?: string;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  if (!configured) {
    return { status: 'error', isPremium: false, message: 'Purchases are unavailable.' };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { status: 'purchased', isPremium: hasProEntitlement(customerInfo) };
  } catch (error) {
    const e = error as { userCancelled?: boolean; message?: string };
    if (e.userCancelled) return { status: 'cancelled', isPremium: false };
    return {
      status: 'error',
      isPremium: false,
      message: e.message ?? 'Something went wrong. Please try again.',
    };
  }
}

/**
 * Restores previous purchases.
 *
 * App Review explicitly tests this path on a fresh install; a missing or broken
 * restore is one of the most common rejection reasons for a paid app.
 */
export async function restorePurchases(): Promise<PurchaseResult> {
  if (!configured) {
    return { status: 'error', isPremium: false, message: 'Purchases are unavailable.' };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { status: 'purchased', isPremium: hasProEntitlement(customerInfo) };
  } catch (error) {
    const e = error as { message?: string };
    return {
      status: 'error',
      isPremium: false,
      message: e.message ?? 'Could not restore purchases.',
    };
  }
}

export function addCustomerInfoListener(
  listener: (info: CustomerInfo) => void,
): () => void {
  if (!configured) return () => {};
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
