/* eslint-env jest */
// RNTL v13+ includes its matchers automatically via the jest-expo preset.

process.env.EXPO_OS = process.env.EXPO_OS || 'ios';

// Reanimated's worklet runtime is native-only. The shipped mock renders the
// animated components synchronously, which is what component tests need.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The ads SDK is native-only; the component contract we care about is "does a
// banner element appear at all", so a marker view is enough.
jest.mock('react-native-google-mobile-ads', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    // One instance, not a fresh pair of mocks per call. `mobileAds()` returning
    // a new object every time made "was the SDK initialised?" unassertable:
    // the mock a test held was never the mock the code called, so every such
    // assertion silently checked a function nobody had invoked.
    default: (() => {
      const instance = {
        initialize: jest.fn().mockResolvedValue([]),
        setRequestConfiguration: jest.fn().mockResolvedValue(undefined),
      };
      return () => instance;
    })(),
    BannerAd: (props) => React.createElement(View, { testID: 'banner-ad', ...props }),
    BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
    MaxAdContentRating: { G: 'G' },
    // The consent API was missing here entirely. Every test passed anyway,
    // because not one of them exercised the consent path -- the absence was
    // invisible until a test finally asked what order consent and ATT run in.
    AdsConsent: {
      gatherConsent: jest.fn().mockResolvedValue({
        status: 'NOT_REQUIRED',
        canRequestAds: true,
        privacyOptionsRequirementStatus: 'NOT_REQUIRED',
      }),
      showPrivacyOptionsForm: jest.fn(),
    },
    AdsConsentDebugGeography: { OTHER: 'OTHER', EEA: 'EEA' },
  };
});

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn().mockResolvedValue(undefined),
    setLogLevel: jest.fn(),
    getCustomerInfo: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
  },
  LOG_LEVEL: { WARN: 'WARN', DEBUG: 'DEBUG' },
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en', regionCode: 'US' }]),
  getCalendars: jest.fn(() => []),
}));

jest.mock('expo-tracking-transparency', () => ({
  getTrackingPermissionsAsync: jest.fn().mockResolvedValue({ granted: false, canAskAgain: true }),
  requestTrackingPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PRIVATE: 0 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
}));

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    Link: ({ children }) => children,
    Stack: { Screen: () => null },
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => ({}),
  };
});
