import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expo app configuration.
 *
 * Every identifier that differs between environments — RevenueCat keys, AdMob
 * IDs, the EAS project — is read from the environment. Nothing secret is
 * committed. The AdMob defaults below are Google's PUBLIC test IDs, so a build
 * with no environment configured still runs and shows test ads rather than
 * failing at launch or accidentally serving (and invalidating) live inventory.
 *
 * See `.env.example` and `docs/RELEASE.md` for the full variable list.
 */

// The build number the CI job computed, which is `git rev-list --count HEAD`.
//
// `||`, never `??`: GitHub Actions maps a missing variable to "", and `??`
// keeps an empty string while `||` falls back on it. An empty CFBundleVersion
// is an invalid Info.plist, not a cosmetic problem.
const BUILD = process.env.APP_BUILD || '1';

/** Google's documented sample IDs — safe to commit, never serve real ads. */
const TEST_ADMOB_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
const TEST_ADMOB_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

// `||`, never `??`, for an identifier that must not be empty.
//
// A GitHub Actions env var mapped from a missing secret arrives as an EMPTY
// STRING, not undefined -- and `??` keeps an empty string. That ships
// `GADApplicationIdentifier = ""`, which makes the Google Mobile Ads SDK raise
// at startup: the app dies on launch, and Apple rejects it for crashing. Four
// apps in this portfolio were rejected for exactly that, which is why
// `attach-verified-build.py` reads the binary before attaching it to a version.
// `||` falls back on the empty string too, so the test identifier is used and
// the app starts.
const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

function bundleId(): string {
  const base = 'com.altixcode.gridhabit';
  if (IS_DEV) return `${base}.dev`;
  if (IS_PREVIEW) return `${base}.preview`;
  return base;
}

function appName(): string {
  if (IS_DEV) return 'GridHabit (Dev)';
  if (IS_PREVIEW) return 'GridHabit (Preview)';
  return 'GridHabit';
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName(),
  slug: 'gridhabit',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'gridhabit',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  primaryColor: '#7C5CFF',
  assetBundlePatterns: ['**/*'],

  ios: {
    bundleIdentifier: bundleId(),
    supportsTablet: true,
    // Was the literal '1', with a comment saying EAS `autoIncrement` managed
    // it. Nothing here builds on EAS -- the release pipeline is GitHub Actions,
    // which computes APP_BUILD and exports it -- so the number never moved and
    // this app's builds could not be matched back to the commit that produced
    // them. `attach-verified-build.py` refused it for exactly that reason.
    buildNumber: BUILD,
    infoPlist: {
      // Shown in the App Tracking Transparency prompt. Required by Apple
      // whenever the IDFA is requested for ad personalisation.
      NSUserTrackingUsageDescription:
        'GridHabit uses this to show ads that are more relevant to you. You can remove ads entirely with a one-time upgrade.',
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ['remote-notification'],
    },
  },

  android: {
    package: bundleId(),
    versionCode: Number.parseInt(BUILD, 10),
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: [
      'com.google.android.gms.permission.AD_ID',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.VIBRATE',
    ],
  },

  plugins: [
    'expo-router',
    'expo-sqlite',
    // iOS 26+ refuses to launch an app that still drives its window from the app delegate:
    // "UIScene life cycle is required for apps built with this SDK." The app installed and
    // then quit to the home screen with nothing on screen to explain why.
    './plugins/withIOSSceneLifecycle',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 180,
        resizeMode: 'contain',
        backgroundColor: '#F7F7F5',
        dark: { backgroundColor: '#0B0B0C' },
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/android-icon-monochrome.png',
        color: '#7C5CFF',
        defaultChannel: 'habit-reminders',
      },
    ],
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission:
          'GridHabit uses this to show ads that are more relevant to you. You can remove ads entirely with a one-time upgrade.',
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.ADMOB_ANDROID_APP_ID || TEST_ADMOB_ANDROID_APP_ID,
        iosAppId: process.env.ADMOB_IOS_APP_ID || TEST_ADMOB_IOS_APP_ID,
        userTrackingUsageDescription:
          'GridHabit uses this to show ads that are more relevant to you. You can remove ads entirely with a one-time upgrade.',
        // Ads are never shown to children; the app is rated 4+ but is not
        // directed at children, so we do not opt into the child-directed API.
        delayAppMeasurementInit: true,
      },
    ],
  ],

  experiments: { typedRoutes: true, reactCompiler: true },

  extra: {
    router: {},
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },

  owner: process.env.EXPO_OWNER,

  updates: {
    // Configured by `eas update:configure`; left empty so a fresh clone builds.
    fallbackToCacheTimeout: 0,
  },
});
