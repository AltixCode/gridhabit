# AdMob setup

One anchored adaptive banner, shown to free users only. No interstitials and no
rewarded ads: GridHabit is opened for a few seconds once a day, and a full-screen
interruption would damage exactly the retention behaviour the product exists to
encourage.

> The implementation plan originally excluded ads entirely for that reason. Ads
> were added as a deliberate product decision, with the one-time upgrade as the
> way out — so the ad surface is kept to the least intrusive format available.

## 1. Create the app and unit

1. In AdMob, add an app per platform (iOS and Android).
2. Copy each **App ID** (`ca-app-pub-…~…`) into `ADMOB_IOS_APP_ID` /
   `ADMOB_ANDROID_APP_ID`. These are injected into the native manifests at build
   time by the `react-native-google-mobile-ads` config plugin.
3. Create one **Banner** ad unit per platform. Copy the **Ad unit ID**
   (`ca-app-pub-…/…`) into `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID` /
   `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID`.

## 2. Test ads

`src/monetization/config.ts` falls back to Google's public test units whenever a
real unit is not configured **or** the build is a debug build (`__DEV__`).
Requesting live ads from a development build violates AdMob policy and can get
the whole account suspended, so this fallback is deliberate and should not be
removed.

## 3. iOS: App Tracking Transparency

`bootstrapAds()` requests ATT *before* initialising the ads SDK — the ordering
matters, otherwise the first ad request goes out non-personalised regardless of
the user's answer. The prompt is deferred until the app knows the user is not
premium, so a paying user is never asked to allow tracking for ads they will
never see.

`NSUserTrackingUsageDescription` is set in `app.config.ts`. If you change the
wording, change it in all three places it appears (the iOS `infoPlist`, the
`expo-tracking-transparency` plugin, and the ads plugin).

## 4. Policy checklist

- [ ] Banner is anchored below content, never overlapping or adjacent to a
      control in a way that invites accidental taps.
- [ ] No ad is requested before `initialize()` resolves.
- [ ] `maxAdContentRating` is `G`, matching a 4+ / Everyone rating.
- [ ] "Contains ads" is declared in the Play Console listing.
- [ ] The app is **not** marked child-directed; it is rated 4+ but is not
      targeted at children.
- [ ] Entitled users never see an ad — verified by the tests in
      `src/components/__tests__/BannerAdSlot.test.tsx`.
