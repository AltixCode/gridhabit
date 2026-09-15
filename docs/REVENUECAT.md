# RevenueCat setup

GridHabit sells a single entitlement, `remove_ads`, through one offering. Getting the
identifiers right matters: the paywall orders and labels plans by matching them
(`src/monetization/entitlements.ts`), and the tests lock that behaviour in.

## 1. Store products

Create these in App Store Connect and Google Play Console first — RevenueCat can
only import products that already exist.

| Product | Type | Suggested price | Store product id |
|---|---|---|---|
| Lifetime | Non-consumable (iOS) / One-time product (Play) | $39.99 | `gridhabit_pro_lifetime` |
| Yearly | Auto-renewable subscription | $19.99 | `gridhabit_pro_yearly` |
| Monthly | Auto-renewable subscription | $2.99 | `gridhabit_pro_monthly` |

On iOS put the two subscriptions in one subscription group so a user can move
between them. On Play put them in one subscription with two base plans.

The habit-tracker audience responds well to lifetime pricing — the product's
value proposition (long-term ownership of your own history) sits badly with an
indefinite subscription — so lifetime is listed **first** and badged *Best
value*.

## 2. RevenueCat project

1. Create a project, then an **App** for each platform.
2. Copy the **public SDK keys** (App-specific, `appl_…` / `goog_…`) into
   `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
   These are publishable client keys; the *secret* key is never used by the app.
3. Upload the App Store Connect in-app purchase key and the Play service account
   so RevenueCat can validate receipts.

## 3. Entitlement

Create one entitlement:

- Identifier: **`remove_ads`** — must match `PRO_ENTITLEMENT` in
  `src/monetization/entitlements.ts`, character for character.

> If these ever disagree, a paying customer is charged and unlocks nothing: the
> purchase succeeds, the entitlement lookup misses, and the app still shows ads
> and the habit limit. An entitlement cannot be renamed after the fact without
> recreating it and re-issuing the SDK keys, so confirm the spelling before the
> first real purchase.
- Attach all three products to it.

## 4. Offering

Create one offering, marked **current**, with three packages:

| Package identifier | Product |
|---|---|
| `$rc_lifetime` | lifetime |
| `$rc_annual` | yearly |
| `$rc_monthly` | monthly |

The paywall reads `offerings.current` and sorts by these identifiers. Custom
identifiers still work as long as they contain `lifetime`, `annual`/`yearly` or
`monthly`, but the standard ones are safest.

## 5. Verify

- **Sandbox purchase** on both platforms: the paywall dismisses, the banner
  disappears immediately, and *Settings* shows the Pro card.
- **Restore on a fresh install**: delete the app, reinstall, tap *Restore
  purchases*. This is the path App Review tests.
- **Offline launch while entitled**: the cached entitlement in
  `usePremiumStore` must keep ads suppressed.
- **No keys configured**: the app must still launch and work as a free,
  ad-free app rather than crashing.
