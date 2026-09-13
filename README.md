# GridHabit

A minimalist habit tracker built around a GitHub-style contribution grid. Every day
you complete a habit fills in a square; months of consistency become a single
picture you actually want to look at.

React Native + Expo (SDK 57), TypeScript, local-first SQLite. Free with a banner
ad and up to four habits; one lifetime purchase removes the ads and the limit
forever.

---

## Quick start

```bash
nvm use 24                 # Expo SDK 57 targets Node 20/22/24
npm ci
cp .env.example .env.local # fill in RevenueCat / AdMob keys (all optional)
npm test                   # 237 unit + component tests
npm run typecheck
```

The app uses native modules (RevenueCat, Google Mobile Ads, SQLite), so it does
**not** run in Expo Go. Build a development client once, then iterate normally:

```bash
npx eas build --profile development --platform ios      # or android
npm start
```

With no `.env.local` at all the app still builds and runs: purchases report
"not configured" (the app behaves as free, and no ads are shown because
entitlements never resolve), and ads fall back to Google's public test units.

## Architecture

```
app/                      expo-router screens
  _layout.tsx             providers, stack, ads + entitlement bootstrap
  index.tsx               Today
  habit/[id].tsx          detail: 52-week grid + stats
  habit/new.tsx           create
  habit/edit/[id].tsx     edit
  settings.tsx            theme, reminders, purchases, dev tools
  archive.tsx             archived habits
  paywall.tsx             modal paywall
src/
  logic/                  PURE domain logic (dates, frequency, streaks, grid)
  db/                     SQLite schema, migrations, repository
  store/                  zustand: habits + entitlements
  monetization/           entitlement rules, RevenueCat, AdMob
  notifications/          reminder scheduling
  theme/                  design tokens, palettes, colour maths
  components/             UI, including ContributionGrid (the hook)
  dev/                    deterministic demo-data seeding
```

### Two rules the codebase is built around

**1. A day is a LOCAL calendar day.** Completions are stored as `YYYY-MM-DD`
strings computed from device-local time, never as UTC instants. `DateKey`s are
parsed back at local *noon*, so a ±1h DST shift can never move a value onto a
different day. Streaks spanning a DST boundary, and a user who flies across
timezones, are covered by explicit regression tests in
`src/logic/__tests__/dates.test.ts` and `streak.test.ts`.

**2. Business logic is pure and native-free.** Streak maths, grid construction,
freemium gating and reminder scheduling contain no native imports, so all of it
is exhaustively unit-tested in plain Node. The repository layer talks to a small
`SqlDriver` interface that `expo-sqlite` already satisfies, which lets the
database tests run against real SQL via `node:sqlite`.

## Monetization

| | Free | Pro |
|---|---|---|
| Habits | 4 | Unlimited |
| Ads | One anchored banner | None |
| Themes / colours | All | All |
| Export | — | CSV / JSON |

Pro is sold through RevenueCat as a lifetime purchase (listed first, marked
*Best value*) alongside yearly and monthly subscriptions. The single entitlement
id is `pro`.

The banner renders only once entitlements have positively resolved *and* the
user is not premium, so a paying user never sees an ad flash on cold start. See
`src/monetization/entitlements.ts` and its tests.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Metro, for a development client |
| `npm test` | Jest (watch: `npm run test:watch`) |
| `npm run test:ci` | Jest with coverage thresholds |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run doctor` | `expo-doctor` config and dependency validation |
| `npm run prebuild` | Regenerate `ios/` and `android/` from config |

## Release

See [`docs/RELEASE.md`](docs/RELEASE.md) for the full store runbook,
[`docs/REVENUECAT.md`](docs/REVENUECAT.md) for products and entitlements, and
[`docs/ADMOB.md`](docs/ADMOB.md) for ad units and policy settings.
