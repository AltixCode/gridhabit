import { Platform } from 'react-native';

/**
 * Runtime monetization configuration, resolved from the environment.
 *
 * No key is hardcoded. RevenueCat *public* SDK keys and AdMob ad-unit IDs are
 * client-side identifiers by nature (they ship inside the binary), which is why
 * they use the `EXPO_PUBLIC_` prefix — but they still differ per environment,
 * so they are injected rather than committed.
 */

/** Google's documented test ad units. Never serve live inventory. */
const TEST_BANNER_IOS = 'ca-app-pub-3940256099942544/2934735716';
const TEST_BANNER_ANDROID = 'ca-app-pub-3940256099942544/6300978111';

function pick(ios: string | undefined, android: string | undefined): string | undefined {
  return Platform.OS === 'ios' ? ios : android;
}

export const revenueCatApiKey: string | undefined = pick(
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
);

/** True when purchases can actually be configured on this build. */
export const isPurchasesConfigured = Boolean(revenueCatApiKey);

/**
 * The banner unit to request. Falls back to Google's test unit whenever a real
 * one is not configured or we are running a debug build — requesting live ads
 * from a development build is an AdMob policy violation that can suspend the
 * whole account.
 */
export const bannerAdUnitId: string =
  (!__DEV__ && pick(
    process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
  )) ||
  (Platform.OS === 'ios' ? TEST_BANNER_IOS : TEST_BANNER_ANDROID);

/** True when this build is pointed at real ad inventory. */
export const isServingLiveAds =
  bannerAdUnitId !== TEST_BANNER_IOS && bannerAdUnitId !== TEST_BANNER_ANDROID;

export const SUPPORT_EMAIL = 'support@altixcode.com';
export const PRIVACY_POLICY_URL = 'https://altixcode.com/gridhabit/privacy';
export const TERMS_URL = 'https://altixcode.com/gridhabit/terms';
