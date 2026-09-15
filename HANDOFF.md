# GridHabit — handoff

Written 2026-09-15. Everything below was checked against the live consoles and
the repo on that date, not inferred.

**Where this app stands:** the code is done and verified on both platforms. It
cannot be submitted yet, and the reasons are mostly outside this repo — AdMob is
not configured for it, the legal URLs 404, and no build has ever been uploaded
to either store.

---

## Identifiers

| | |
|---|---|
| Bundle id / package | `com.altixcode.gridhabit` |
| App Store Connect app | `6811948553` (version 1.0, `PREPARE_FOR_SUBMISSION`) |
| In-app purchase | `com.altixcode.gridhabit.removeads` — ASC id `6811948800`, state `MISSING_METADATA` |
| RevenueCat project | `projc9d1ddd2` |
| RevenueCat apps | iOS `app8894f6f0e9` · Android `app22b952854b` |
| RevenueCat entitlement | `remove_ads` — ✅ matches the code |
| Play Console | **no record / no bundle uploaded** |
| AdMob | nothing created |

---

## What is done

- **Ads**: AdMob banner only (`src/monetization/ads.ts`,
  `src/components/BannerAdSlot.tsx`). No interstitial — a habit tracker is
  opened for ten seconds at a time and an interstitial would dominate it.
- **Consent**: UMP is gathered before the SDK starts, published to
  `src/store/useAdsConsentStore.ts` so the banner re-renders when it resolves,
  and gates the banner. "Ad privacy settings" appears in Settings only where UMP
  reports privacy options exist.
- **Entitlement**: `remove_ads`, matching RevenueCat. One purchase removes the
  ads *and* unlocks the paid features.
- **Release gate**: `npm run check:release` refuses a build whose identifiers
  are absent, blank, or still a Google test unit. It runs in the store-build workflow before anything is built.
- **Tests**: 455 passing, typecheck clean.
- **Localization**: none — this app is English-only.
- **CI**: `.github/workflows/ci.yml` runs typecheck, the test suite and both
  bundle exports.
- **Store build**: `.github/workflows/build.yml` is a dispatch-only EAS build.
  `npm run check:release` runs for the `production` profile only — a preview
  build is supposed to carry test units. `submit.yml` handles submission.
- **Verified on device**: Android — built, installed, launched, consent
  resolved, and the AdMob test banner rendered anchored at the bottom with the
  layout intact. iOS — built, installed, launched, renders, consent flow
  reached.

---

## What is left that an agent can do

1. **Capture App Store screenshots.** None exist for this app. Both sizes are
   required: 6.9" iPhone (1320×2868) and 13" iPad (2064×2752). Use
   `Dev/scripts/store-screenshots.sh`, which drives the real app over its own
   fixtures. They land in `store/screenshots/iphone-6.9/` and
   `store/screenshots/ipad-13/`.

2. **Write and upload the store listing.** This app has no description and no
   keywords in App Store Connect, in any locale — the listing check fails on
   every one. The other apps carry 5 locales each in
   `Dev/scripts/store-metadata.json`; add an entry for GridHabit and upload it with
   `Dev/scripts/upload-store-metadata.mjs`. Limits: name 30, subtitle 30,
   keywords 100, Play title 30, short description 80.

3. **Upload the IAP review screenshot.** The in-app purchase
   (`com.altixcode.gridhabit.removeads`) is localized and priced at $3.99, and sits at
   `MISSING_METADATA` for want of one screenshot:

   ```bash
   asccli iap-review-screenshot upload --iap-id 6811948800 --file <path-to-png>
   ```

4. **Rename the purchase.** Its App Store display name and description still
   describe only half of what it does. One purchase removes the ads *and*
   unlocks the paid features, so both halves belong in the copy — something
   like "Pro — Ad-Free & Unlimited" (name ≤ 30 chars, description ≤ 45):

   ```bash
   asccli iap-localizations update --localization-id <id> \
     --name "Pro — Ad-Free & Unlimited" --description "<= 45 chars"
   ```

5. **Localize the app.** It is English-only; the rest of the portfolio ships
   12–14 locales with hand-written CLDR plural rules (Hermes has no CLDR plural
   database, so `Intl.PluralRules` answers as if English — see any other app's
   `src/i18n/index.ts`).

---

## What only you can do

1. **AdMob — nothing exists for this app.** There is no write API at all; it is
   console-only. Create the app on both platforms, then banner ad units,
   and note the ids. Answer **"No, not listed on a supported app store"** while
   the app is unpublished — linking later does not change the ids.

   Then publish a **GDPR message and a US-states message** under Privacy &
   messaging. The SDK can only present a message that exists, and this app fails
   closed on missing consent — so without them it shows **no ads at all** in the
   EEA. Expect "Requires review — limited ad serving" for a couple of days after
   the app goes live; that is not an integration bug.

2. **RevenueCat — Apple credentials.** `app8894f6f0e9` (the App Store app in project
   `projc9d1ddd2`) has no Apple credentials, so App Store purchases cannot be
   validated. This needs an interactive Apple ID sign-in with 2FA:

   ```bash
   rc setup apple app8894f6f0e9
   ```

   An App Store Connect *API* key can be set non-interactively; the separate
   **In-App Purchase key** cannot, which is why this one is yours.

3. **GitHub secrets.** The signing secrets are present. These are not, and CI now
   fails without them — deliberately, because a build missing one earns nothing
   while looking perfectly healthy. Note this repo lives under
   `atasmohammadi/gridhabit`, a **personal account**: the self-hosted
   runners are org-scoped, so any job targeting them queues forever. Keep this
   app's workflows on GitHub-hosted runners, or move the repo into the
   AltixCode org:

   ```
   ADMOB_IOS_APP_ID
   ADMOB_ANDROID_APP_ID
   EXPO_PUBLIC_ADMOB_IOS_BANNER_ID
   EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID
   EXPO_PUBLIC_REVENUECAT_IOS_KEY
   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
   ```

   Set each with `gh secret set <KEY> --repo atasmohammadi/gridhabit`. The RevenueCat
   public SDK keys are fetchable — `rc api GET "/projects/projc9d1ddd2/apps/app8894f6f0e9/public_api_keys"`
   — the AdMob ones come from step 1.

4. **The legal URLs are wrong and they 404.** `src/monetization/config.ts` points at
   `https://altixcode.com/gridhabit/privacy`.

   Nothing is served there: altixcode.com only has `/legal/privacy`,
   `/legal/terms` and `/legal/cookies`. Both stores require a working privacy
   policy, the App Store record needs the same URL, and the policy text must now
   disclose that ads are served by Google AdMob and that ATT/UMP consent governs
   personalisation. Either publish per-app pages under altixcode.com or point
   `src/monetization/config.ts` at the generic ones — either way the ads paragraph has to be
   written.

5. **Play Console — create the app.** `com.altixcode.gridhabit` is not recognised by
   the Publishing API, which means no app record exists or no bundle has ever
   been uploaded. A Play app has **no package name until its first bundle is
   uploaded**, and until then no in-app product can be created. The order is:
   create app → upload an AAB to internal testing → *then* create the product.
   Build that AAB from a non-production profile so internal testers generate no
   live impressions.

6. **App Store review contact.** No contact email or phone is set in App Store
   review information; the readiness check fails on it.

7. **Runners.** This repo's workflows run on GitHub-hosted runners, so the
   stopped self-hosted runner does not block it — but the self-hosted macOS
   runner has been down since 2026-09-13 (it filled the disk), and any job that
   does target it will queue forever.

8. **No EAS project is linked.** `eas env:list` and any EAS build refuse with
   "EAS project not configured", and a robot token cannot configure it
   interactively — it needs `eas init --id <project-id> --non-interactive`, with
   `owner` and the project id then set by hand in the app config.

9. **Play Developer Reporting API is disabled** for project 1013025269741, so
   `gplay apps list` returns 403. The service account cannot enable it
   (`serviceusage.services.enable` is missing); it has to be enabled in the
   Cloud Console.

---

## Fixed recently — context for anything that looks odd

- **It could not launch on iOS at all.** It installed, opened and quit straight
  back to the home screen; the only trace was a device-log line, *"UIScene life
  cycle is required for apps built with this SDK."* `plugins/withIOSSceneLifecycle`
  was missing and is now wired into `app.config.ts`.
- **It would have shipped showing no ads.** `usePremiumStore` left `isReady`
  false whenever RevenueCat was unconfigured or unreachable, which the banner
  reads as "still loading" — forever. On any device where billing is
  unavailable, a free app monetised by ads earned nothing. It now resolves to
  "free" and serves ads, while the cached entitlement still protects a paying
  user (`usePremiumStore.unconfigured.test.ts` pins this).
- **It had no UMP consent flow**: the SDK was initialised and ads requested with
  no consent gathered at all, which is the breach that suspends AdMob accounts.
- The ads SDK was on `^16.5.0` and the Android build failed on the Kotlin 2.3.0
  metadata trap; it is pinned to 16.3.4.

---

## Traps already paid for — do not rediscover these

- **`react-native-google-mobile-ads` must stay pinned to exactly 16.3.4.** 16.4+
  pulls play-services-ads 25.3+, whose Kotlin 2.3.0 metadata SDK 57's Kotlin
  2.1.0 refuses to read. Forcing Kotlin up instead breaks `react-native-purchases`
  and `safe-area-context`.
- **iOS 26+ needs UIScene adoption** (`plugins/withIOSSceneLifecycle`). Without
  it the app installs, launches, and quits straight back to the home screen,
  with nothing on screen to explain why.
- **`JAVA_HOME` must be** `/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`
  for any Android build. Gradle otherwise falls back to JDK 25 and CMake dies.
- **A missing identifier fails nothing.** The app falls back to Google's test ad
  units, works perfectly, and earns nothing. That is what `check:release` exists
  to stop.
- **`expo run:android` can fail in a second and leave the previous APK
  installed** — the app then launches, renders, and proves nothing. Check the
  build's own exit code before believing a screenshot.
- **Simulator.app is missing from this Xcode install**, so the ATT prompt cannot
  be dismissed on iOS. iOS verification ends at "builds, installs, launches,
  renders"; drive interaction on Android.

---

## Commands

```bash
npm run typecheck && npm test          # both clean as of 2026-09-15
npm run check:release                  # fails until the identifiers exist — correct
../scripts/verify-app.sh gridhabit com.altixcode.gridhabit   # full build + device verification, both platforms
```

The portfolio-wide notes live in `Dev/AGENTS.md`, and the store/console playbook
in `Dev/gridlock-pop/docs/mobile-playbook.md`. The shared ad integration is
ported by `Dev/scripts/port-ads.mjs` from CapFlow, which is the reference.

---

## One caution

Everything in this repo is **uncommitted**. Read `git status` before assuming
the working tree matches `main`.
