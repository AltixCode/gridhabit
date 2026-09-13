import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';

/**
 * Google Mobile Ads bootstrap.
 *
 * Order matters on iOS: App Tracking Transparency must be requested BEFORE the
 * ads SDK initialises, otherwise the first ad request goes out non-personalised
 * regardless of what the user then chooses. We also never prompt on a cold
 * first frame — the caller defers this until the user has seen the app once.
 */

let initialised = false;

/** Requests ATT on iOS. Returns true when the user granted tracking. */
export async function requestTrackingPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios') return true;
  try {
    const current = await getTrackingPermissionsAsync();
    if (!current.canAskAgain) return current.granted;
    const result = await requestTrackingPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

export async function initializeAds(): Promise<void> {
  if (initialised) return;
  initialised = true;
  try {
    await mobileAds().setRequestConfiguration({
      // The app is rated 4+ but is not directed at children; G-rated ad content
      // keeps it comfortably inside both stores' rating policies.
      maxAdContentRating: MaxAdContentRating.G,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await mobileAds().initialize();
  } catch {
    // A failed ads init must never block the app. Banners simply do not render.
    initialised = false;
  }
}

/**
 * Full ad bootstrap for a non-premium user: ask for tracking, then initialise.
 * Safe to call more than once.
 */
export async function bootstrapAds(): Promise<void> {
  await requestTrackingPermission();
  await initializeAds();
}
