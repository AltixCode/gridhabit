import AsyncStorage from '@react-native-async-storage/async-storage';

// A build with no RevenueCat key: a fresh clone, a CI smoke build, or a device where billing
// is simply unavailable. The app has to keep working -- and keep earning.
jest.mock('@/monetization/config', () => ({
  isPurchasesConfigured: false,
  revenueCatApiKey: undefined,
  bannerAdUnitId: 'test_banner',
  isServingLiveAds: false,
  SUPPORT_EMAIL: 'support@example.com',
  PRIVACY_POLICY_URL: 'https://example.com/privacy',
  TERMS_URL: 'https://example.com/terms',
}));

jest.mock('@/monetization/purchases', () => ({
  configurePurchases: jest.fn(),
  getCustomerInfo: jest.fn(),
  getCurrentOffering: jest.fn(),
  addCustomerInfoListener: jest.fn(() => jest.fn()),
  hasProEntitlement: jest.fn(() => false),
  restorePurchases: jest.fn(),
  purchasePackage: jest.fn(),
  orderedPackages: jest.fn(() => []),
  toPlanLike: jest.fn(),
}));

/* eslint-disable import/first -- jest.mock() must be hoisted above these imports. */
import { configurePurchases } from '@/monetization/purchases';
import { usePremiumStore } from '@/store/usePremiumStore';
/* eslint-enable import/first */

describe('usePremiumStore without billing configured', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    usePremiumStore.setState({ isPremium: false, isReady: false });
  });

  it('resolves entitlement instead of loading forever, so ads can serve', async () => {
    // Left as "still loading", the banner never renders and the app earns nothing on exactly
    // the devices where billing is unavailable.
    await usePremiumStore.getState().initialize();

    expect(usePremiumStore.getState().isReady).toBe(true);
    expect(usePremiumStore.getState().isPremium).toBe(false);
    expect(configurePurchases).not.toHaveBeenCalled();
  });

  it('still honours a cached entitlement, so a paying user sees no ads', async () => {
    await AsyncStorage.setItem('gridhabit.entitlement.pro', '1');

    await usePremiumStore.getState().initialize();

    expect(usePremiumStore.getState().isPremium).toBe(true);
  });
});
