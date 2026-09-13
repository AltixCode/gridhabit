import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@/monetization/config', () => ({
  isPurchasesConfigured: true,
  revenueCatApiKey: 'test_key',
  bannerAdUnitId: 'test_banner',
  isServingLiveAds: false,
  SUPPORT_EMAIL: 'support@example.com',
  PRIVACY_POLICY_URL: 'https://example.com/privacy',
  TERMS_URL: 'https://example.com/terms',
}));

jest.mock('@/monetization/purchases', () => ({
  configurePurchases: jest.fn().mockResolvedValue(undefined),
  getCustomerInfo: jest.fn().mockResolvedValue(null),
  getCurrentOffering: jest.fn().mockResolvedValue(null),
  hasProEntitlement: jest.fn().mockReturnValue(false),
  orderedPackages: jest.fn().mockReturnValue([]),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  addCustomerInfoListener: jest.fn().mockReturnValue(() => {}),
}));

/* eslint-disable import/first -- jest.mock() must be hoisted above these imports. */
import {
  addCustomerInfoListener,
  configurePurchases,
  getCustomerInfo,
  hasProEntitlement,
  orderedPackages,
  purchasePackage,
  restorePurchases,
} from '@/monetization/purchases';

import { usePremiumStore } from '../usePremiumStore';
/* eslint-enable import/first */

const mocked = {
  configurePurchases: configurePurchases as jest.Mock,
  getCustomerInfo: getCustomerInfo as jest.Mock,
  hasProEntitlement: hasProEntitlement as jest.Mock,
  orderedPackages: orderedPackages as jest.Mock,
  purchasePackage: purchasePackage as jest.Mock,
  restorePurchases: restorePurchases as jest.Mock,
  addCustomerInfoListener: addCustomerInfoListener as jest.Mock,
};

const CACHE_KEY = 'gridhabit.entitlement.pro';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  usePremiumStore.setState({
    isPremium: false,
    isReady: false,
    packages: [],
    isPurchasing: false,
    error: null,
  });
  mocked.hasProEntitlement.mockReturnValue(false);
  mocked.addCustomerInfoListener.mockReturnValue(() => {});
  mocked.orderedPackages.mockReturnValue([]);
});

describe('initialize', () => {
  it('configures RevenueCat and marks entitlements resolved', async () => {
    await usePremiumStore.getState().initialize();
    expect(mocked.configurePurchases).toHaveBeenCalled();
    expect(usePremiumStore.getState().isReady).toBe(true);
    expect(usePremiumStore.getState().isPremium).toBe(false);
  });

  it('marks the user premium when the entitlement is active', async () => {
    mocked.hasProEntitlement.mockReturnValue(true);
    await usePremiumStore.getState().initialize();
    expect(usePremiumStore.getState().isPremium).toBe(true);
  });

  it('caches the entitlement so the next cold start knows immediately', async () => {
    mocked.hasProEntitlement.mockReturnValue(true);
    await usePremiumStore.getState().initialize();
    await expect(AsyncStorage.getItem(CACHE_KEY)).resolves.toBe('1');
  });

  it('seeds from the cache, so an offline paying user is never shown an ad', async () => {
    await AsyncStorage.setItem(CACHE_KEY, '1');
    // The network call comes back empty, as it would with no connection.
    mocked.getCustomerInfo.mockResolvedValue(null);
    mocked.hasProEntitlement.mockReturnValue(false);

    await usePremiumStore.getState().initialize();
    expect(usePremiumStore.getState().isPremium).toBe(true);
  });

  it('does not promote a free user just because the cache says free', async () => {
    await AsyncStorage.setItem(CACHE_KEY, '0');
    await usePremiumStore.getState().initialize();
    expect(usePremiumStore.getState().isPremium).toBe(false);
  });

  it('subscribes to entitlement changes and applies them', async () => {
    await usePremiumStore.getState().initialize();
    const listener = mocked.addCustomerInfoListener.mock.calls[0]![0] as (i: unknown) => void;

    mocked.hasProEntitlement.mockReturnValue(true);
    listener({});
    expect(usePremiumStore.getState().isPremium).toBe(true);

    mocked.hasProEntitlement.mockReturnValue(false);
    listener({});
    expect(usePremiumStore.getState().isPremium).toBe(false);
  });

  it('still reports ready when configuration throws, so the app is usable', async () => {
    mocked.configurePurchases.mockRejectedValueOnce(new Error('network down'));
    await usePremiumStore.getState().initialize();
    expect(usePremiumStore.getState().isReady).toBe(true);
    expect(usePremiumStore.getState().error).toMatch(/network down/);
  });
});

describe('purchase', () => {
  const pkg = { identifier: '$rc_lifetime' } as never;

  it('grants premium on success and clears the busy flag', async () => {
    mocked.purchasePackage.mockResolvedValue({ status: 'purchased', isPremium: true });
    await expect(usePremiumStore.getState().purchase(pkg)).resolves.toBe('purchased');
    expect(usePremiumStore.getState().isPremium).toBe(true);
    expect(usePremiumStore.getState().isPurchasing).toBe(false);
    await expect(AsyncStorage.getItem(CACHE_KEY)).resolves.toBe('1');
  });

  it('leaves the user unchanged on cancellation and records no error', async () => {
    mocked.purchasePackage.mockResolvedValue({ status: 'cancelled', isPremium: false });
    await expect(usePremiumStore.getState().purchase(pkg)).resolves.toBe('cancelled');
    expect(usePremiumStore.getState().isPremium).toBe(false);
    expect(usePremiumStore.getState().error).toBeNull();
  });

  it('surfaces a failure message', async () => {
    mocked.purchasePackage.mockResolvedValue({
      status: 'error',
      isPremium: false,
      message: 'Card declined',
    });
    await expect(usePremiumStore.getState().purchase(pkg)).resolves.toBe('error');
    expect(usePremiumStore.getState().error).toBe('Card declined');
    expect(usePremiumStore.getState().isPurchasing).toBe(false);
  });
});

describe('restore', () => {
  it('reports purchased and grants premium when a purchase is found', async () => {
    mocked.restorePurchases.mockResolvedValue({ status: 'purchased', isPremium: true });
    await expect(usePremiumStore.getState().restore()).resolves.toBe('purchased');
    expect(usePremiumStore.getState().isPremium).toBe(true);
  });

  it('reports none when the account has no entitlement', async () => {
    mocked.restorePurchases.mockResolvedValue({ status: 'purchased', isPremium: false });
    await expect(usePremiumStore.getState().restore()).resolves.toBe('none');
    expect(usePremiumStore.getState().isPremium).toBe(false);
  });

  it('reports an error and keeps the busy flag clear', async () => {
    mocked.restorePurchases.mockResolvedValue({ status: 'error', message: 'offline' });
    await expect(usePremiumStore.getState().restore()).resolves.toBe('error');
    expect(usePremiumStore.getState().error).toBe('offline');
    expect(usePremiumStore.getState().isPurchasing).toBe(false);
  });
});

describe('refreshOfferings', () => {
  it('stores the ordered packages', async () => {
    mocked.orderedPackages.mockReturnValue([{ identifier: '$rc_lifetime' }]);
    await usePremiumStore.getState().refreshOfferings();
    expect(usePremiumStore.getState().packages).toHaveLength(1);
  });
});

describe('clearError', () => {
  it('resets the error', () => {
    usePremiumStore.setState({ error: 'boom' });
    usePremiumStore.getState().clearError();
    expect(usePremiumStore.getState().error).toBeNull();
  });
});
