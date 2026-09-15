# GridHabit — Handoff

**Status:** feature-complete for v1.0.0, not yet submitted to either store.
**Last verified:** 2026-09-15 at commit `baf1a56`.

This document is the single place to pick the project back up. It is written for
whoever resumes it — a coding agent or a person — and for the account owner, who
has manual work only they can do. Read §1 and §2, then go to §5 (manual steps) or
§6 (engineering work) depending on which you are.

---

## 1. What this app is

A minimalist habit tracker whose entire differentiator is a GitHub-style
contribution grid. React Native + Expo SDK 57, TypeScript, local-first SQLite.
Free with one banner ad and up to four habits; a one-time lifetime purchase
removes the ads and the limit.

The original spec is `03-habit-tracker-implementation-plan.md` in the parent
directory. Everything in its P0 and P1 lists is built. P2 (cloud sync, widgets,
extra grid styles) is deliberately not started — the plan says to wait for
conversion data first, and that is still the right call.

**One deviation from the spec, deliberate:** the plan excluded ads entirely,
arguing they hurt retention for an app opened briefly once a day. The owner asked
for ads with a lifetime upgrade to remove them. That is what is built, mitigated
by keeping the surface minimal: one anchored banner, no interstitials, no
rewarded ads, gone the instant someone upgrades. Reasoning is recorded in
`docs/ADMOB.md`.

---

## 2. Current state

| | |
|---|---|
| Tests | 468 passing, 30 suites |
| Coverage | 90.5% statements, 83.3% branches (thresholds enforced in CI) |
| Lint / typecheck | clean |
| `expo-doctor` | 21/21 |
| Bundles | iOS and Android both export |
| Run on a device | **Simulator only, and only partially — see §4** |
| CI | **Red for a billing reason, not a code reason — see §5.0** |

Verify all of it in one go:

```bash
nvm use 24            # Expo SDK 57 wants Node 20/22/24; 26 is untested here
npm ci
npm run lint && npm run typecheck && npm run test:ci && npm run doctor && npm run bundle
```

---

## 3. Where things live

```
app/                      expo-router screens (each has a render test)
  _layout.tsx             providers, stack, ads + entitlement bootstrap
  index.tsx               Today
  habit/[id].tsx          detail: 52-week grid + stats
  habit/new.tsx           create
  habit/edit/[id].tsx     edit
  settings.tsx            theme, reminders, purchases, export, dev tools
  archive.tsx             archived habits
  reorder.tsx             arrange the Today list
  paywall.tsx             modal paywall
src/
  logic/                  PURE domain logic (dates, frequency, streaks, grid)
  db/                     SQLite schema, migrations, repository
  store/                  zustand: habits, entitlements, ads consent
  monetization/           entitlement rules, RevenueCat, AdMob, UMP consent
  notifications/          reminder scheduling
  export/                 CSV / JSON serializers and the share sheet
  theme/                  design tokens, palettes, colour maths
  components/             UI, including ContributionGrid (the hook)
  dev/                    deterministic demo-data seeding
plugins/                  withIOSSceneLifecycle (iOS 26+ scene adoption)
scripts/                  asset generation, release-config guard
docs/                     RELEASE, REVENUECAT, ADMOB, PRIVACY, TERMS
store/                    listing copy, screenshot plan, privacy answers
```

### Four invariants — do not break these

**1. A day is a LOCAL calendar day.** Completions are stored as `YYYY-MM-DD`
computed from device-local time, never a UTC instant, and parsed back at local
*noon* so no DST shift can move a value onto another day. There are explicit
spring-forward and fall-back regression tests. If you touch anything in
`src/logic/dates.ts`, run those first.

**2. Array-building selectors must be wrapped.** Zustand v5 compares snapshots
with `Object.is`. Subscribing directly to a selector that returns a new array
(`state.habits.filter(...)`, or `?? []`) makes React see a change every render
and throw *Maximum update depth exceeded*. This already crashed the Today screen
once. Use `useShallow`, a scalar selector, or the shared `NO_COMPLETIONS`
constant. The render tests in `app/__tests__/` exist to catch it.

**3. Ads never render before entitlements resolve.** `shouldShowAds` requires
`isReady === true` *and* `isPremium === false`, and `BannerAdSlot` additionally
requires UMP consent. A paying user glimpsing an ad on cold start is the single
most damaging bug this feature can have.

**4. Business logic stays pure and native-free.** Streaks, grid construction,
freemium gating, reminder scheduling and export serialization contain no native
imports, so they are exhaustively unit-tested in plain Node. The repository
talks to a small `SqlDriver` interface that `expo-sqlite` already satisfies,
which lets the database tests run real SQL via `node:sqlite`.

### Things that look wrong but are not

- **`PRO_ENTITLEMENT` is `'remove_ads'`, not `'pro'`.** It matches the store
  product name. It must match the RevenueCat entitlement character for
  character — see §5.6.
- **AdMob IDs fall back to Google's public test units.** Deliberate: a debug
  build must never request live inventory (an AdMob policy violation that can
  suspend the account). `npm run check:release` is what stops a *production*
  build shipping with them.
- **`getHabit` and `listCompletionDates` look unused.** The test suite uses them
  to reload a row and verify a write landed through a different path than the
  one that wrote it. Keep them.
- **`react-native-google-mobile-ads` is pinned to `16.3.4`, not `^16.5.0`.**
  16.3.4 is what Expo SDK 57 expects; `expo install --check` confirms. Do not
  bump it without re-running that check.

---

## 4. What has and has not been exercised

This matters more than anything else in this document.

**Verified:** everything covered by the 468 tests; that both platforms bundle;
that `expo prebuild` produces valid native projects with the AdMob IDs,
permissions, ATT strings and the iOS scene delegate correctly injected.

**Partially verified:** the app has been launched on an **iOS simulator**. That
is how the iOS 26 scene-lifecycle crash was found and fixed
(`plugins/withIOSSceneLifecycle.js`) — before it, the app installed and quit to
the home screen with nothing on screen.

**Never verified — assume broken until proven otherwise:**

- A real purchase, in sandbox or production, on either store.
- **Restore Purchases on a fresh install.** App Review tests this explicitly and
  a broken restore is a top rejection reason.
- Whether ads actually fill, and whether they disappear the moment a purchase
  completes.
- The UMP consent form appearing (it cannot, until §5.8 is done in the AdMob
  console).
- Notification delivery — including across a timezone change and a DST boundary,
  which is the risk the whole date layer was designed around.
- Android at all, on device or emulator.
- VoiceOver / TalkBack passes on the real screens.

---

## 5. Manual steps — for the account owner

Nothing in §6 unblocks a submission. These do. Roughly half a day of console
work, then a week of dogfooding.

### 5.0 — Blocking right now: GitHub Actions billing

CI is red and **it is not the code.** Every job fails the moment it is queued,
with no failing step and no logs, which reads exactly like a broken workflow.
The real reason is only visible through the API:

```bash
gh api repos/<owner>/<repo>/check-runs/<job_id>/annotations -q '.[].message'
# → "The job was not started because recent account payments have failed or
#    your spending limit needs to be increased."
```

Fix in GitHub → Settings → Billing & plans. Until then, verify locally with the
one-liner in §2.

### 5.1 — Accounts (everything else depends on these)

| Step | Where | Note |
|---|---|---|
| Apple Developer Program | developer.apple.com | $99/yr. Record your **Team ID**. |
| App Store Connect app record | appstoreconnect.apple.com | Bundle `com.altixcode.gridhabit`. Record the numeric **ASC App ID**. |
| Apple app-specific password | appleid.apple.com | For `eas submit`. |
| Google Play Console | play.google.com/console | $25 once. Same package name. |
| Play service account | Play Console → Setup → API access | Download the JSON. **Never commit it.** |

### 5.2 — Create the in-app purchases **first**

RevenueCat can only import products that already exist in the stores.

| Product | Type | Price | Product ID |
|---|---|---|---|
| Lifetime | Non-consumable / one-time | $39.99 | `gridhabit_pro_lifetime` |
| Yearly | Auto-renewable subscription | $19.99 | `gridhabit_pro_yearly` |
| Monthly | Auto-renewable subscription | $2.99 | `gridhabit_pro_monthly` |

On iOS put both subscriptions in one subscription group. On Play, one
subscription with two base plans.

### 5.3–5.6 — RevenueCat

1. Create a project, then an **App** per platform.
2. Upload the App Store Connect in-app-purchase key and the Play service account
   so receipts can be validated.
3. Copy the **public** SDK keys (`appl_…`, `goog_…`). The secret key is never
   used by this app.
4. Create the entitlement — identifier **`remove_ads`**, exactly. Attach all
   three products.

> **This is the highest-consequence manual step in the project.** If the
> entitlement identifier does not match `PRO_ENTITLEMENT` in
> `src/monetization/entitlements.ts`, a paying customer is charged and unlocks
> nothing: the purchase succeeds, the entitlement lookup misses, and the app
> still shows ads and the four-habit limit. An entitlement cannot be renamed
> afterwards without recreating it and re-issuing the SDK keys. Confirm the
> spelling before the first real purchase.

5. Create one offering, marked **current**, with packages `$rc_lifetime`,
   `$rc_annual`, `$rc_monthly`. The paywall orders and labels plans by matching
   these identifiers.

Full detail in `docs/REVENUECAT.md`.

### 5.7 — AdMob apps and units

One app per platform (record the **App IDs**), one **banner** unit per platform
(record the **Unit IDs**). No interstitials or rewarded ads — see §1.

### 5.8 — AdMob consent message ← easy to miss

**AdMob → Privacy & messaging → create the GDPR/EU consent message and publish
it.**

Without this, UMP returns "no form available", `canServeAds` stays false, and
**no ads render at all, anywhere.** The app code is correct and fully tested;
the missing piece is console configuration. If ads are silently absent after
launch, check this first.

### 5.9 — EAS and secrets

```bash
eas init
eas env:create --environment production --name <KEY> --value <value>
```

GitHub → Settings → Secrets and variables → Actions:

| Secret | Used by |
|---|---|
| `EXPO_TOKEN` | all EAS workflows |
| `EAS_PROJECT_ID`, `EXPO_OWNER` | app config resolution |
| `ADMOB_IOS_APP_ID`, `ADMOB_ANDROID_APP_ID` | native manifest injection at build |
| `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID`, `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` | runtime ad units |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | billing |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Play submission (whole file contents) |
| `ASC_APP_ID`, `APPLE_TEAM_ID` | App Store submission |
| `EXPO_APPLE_APP_SPECIFIC_PASSWORD` | App Store submission |

Also create a protected GitHub environment named **`store-release`** with a
required reviewer; the submit workflow runs inside it.

### 5.10 — Host the legal pages

Publish `docs/PRIVACY.md` and `docs/TERMS.md` at the URLs in
`src/monetization/config.ts` (currently `altixcode.com/gridhabit/privacy` and
`/terms`). They must resolve before submission — App Review checks them, and the
paywall links to them. Update the constants if you host elsewhere.

### 5.11 — Store listing

- Copy is ready to paste in `store/listing.md`.
- **Screenshots** — six shots, per `store/screenshots.md`. Capture from a
  development build after *Settings → Developer → Seed demo data*, **never from
  a fresh install**. Shot 1 is the populated 52-week grid and it decides most
  installs. The seeder is deterministic, so any shot can be regenerated
  identically later.
- Icon and feature graphic are generated: `npm run assets`.
- App Privacy (Apple) and Data Safety (Play) answers are pre-written in
  `store/privacy-answers.md`. Note **"used for tracking: Yes"** on iOS — that is
  what obliges the ATT prompt — and **"contains ads: Yes"** on Play.
- Age rating 4+ / Everyone.

### 5.12 — Dogfood, then submit

```bash
eas build --profile preview --platform all     # TestFlight + Play Internal
```

Use it daily for **at least a week**. This app's value only becomes visible with
real accumulated data, and a week of use is also the only way the notification
and streak behaviour gets exercised against a real clock.

Then run the pre-submission checklist in `docs/RELEASE.md` §7 and:

```bash
eas build --profile production --platform all
eas submit  --profile production --platform all --latest
```

Android lands on the `internal` track as a **draft**; promote it manually.

---

## 6. Engineering work left — for whoever resumes

Ordered by value. None of it blocks submission except what §5 gates.

### 6.1 — Crash reporting (highest value, ~30 min)

There is none. A production app with no crash visibility is flying blind, and
this is the largest remaining quality gap. Add Sentry or Bugsnag, wire it in
`app/_layout.tsx`, and keep the DSN env-driven like every other key.

**Note:** adding it changes what the app collects, so `store/privacy-answers.md`
and `docs/PRIVACY.md` must be updated in the same change. An out-of-date privacy
declaration is one of the few things that can get an app pulled after it is live.

### 6.2 — Error boundary

An uncaught render error currently surfaces expo-router's default screen. Add a
root boundary with a "something went wrong / restart" path and report to
whatever §6.1 installs.

### 6.3 — Test `app/_layout.tsx`

It is the only file excluded from coverage (`jest.config.js`). It is the root
provider tree and the ads/entitlement bootstrap — the same class of blind spot
that hid the Today-screen render loop for three commits. Rendering it in a test
is awkward because of `SQLiteProvider` and `Suspense`, which is exactly why it
was skipped; that is not a good enough reason.

### 6.4 — Device QA pass

Work through §4's "never verified" list on real hardware, both platforms. Much
of it cannot be automated and none of it can be faked.

### 6.5 — Accepted risk worth revisiting

When RevenueCat keys are absent, `usePremiumStore` now sets `isReady: true`, so
ads serve. This is right for a device where billing is genuinely unavailable —
previously the app earned nothing there. But it also means a *misconfigured
release* would show ads with a paywall that cannot sell anything. `npm run
check:release` guards the build, and the production workflow runs it, so the
window is small. If that guard is ever weakened, revisit this.

### 6.6 — P2, only after conversion data

Cloud sync (Supabase, paid tier only), home-screen widgets (native, treat as its
own mini-project), extra grid styles. The plan is explicit that these wait for
free→paid conversion numbers.

---

## 7. Conventions

- **TDD.** Write the failing test, watch it fail, then implement. Several real
  bugs in this repo were found that way, and each fix has a guard that was
  verified by temporarily reverting the fix.
- Run `npm run lint && npm run typecheck && npm run test:ci` before every commit.
  CI enforces all three plus a production bundle.
- The test suite runs with **zero console warnings or errors**. Keep it that way;
  noise is how real warnings get missed.
- Coverage thresholds are enforced. Raise them when they are comfortably
  exceeded; do not lower them to make a change fit.
- Exclusions in `collectCoverageFrom` need a stated reason, and the reason has to
  stay true. `ads.ts` was excluded as a "thin adapter" and then grew the UMP
  consent decision — two bugs hid in exactly that gap.
- No secrets in the repo. Every identifier is env-driven; `.env.example` lists
  them all.
- Accessibility is not optional: 44pt touch targets, WCAG AA contrast (there is a
  test suite asserting it for every palette pair), labels on every icon-only
  control, and a single-pointer alternative to any drag interaction.
