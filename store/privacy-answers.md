# App Privacy (Apple) and Data Safety (Play)

These answers must match what the binary actually does. The habit data itself
never leaves the device; the advertising SDK, however, does collect identifiers,
and under-declaring that is a rejection (and, on Play, an enforcement) risk.

## What the app actually collects

| Source | Data | Leaves device? | Why |
|---|---|---|---|
| GridHabit itself | Habit names, colours, schedules, completion dates | **No** — local SQLite only | The product |
| Google Mobile Ads | Device advertising identifier, coarse device info, approximate location (IP-derived) | Yes, to Google | Ad serving and measurement |
| RevenueCat | An anonymous app user id, purchase receipts, store country | Yes, to RevenueCat and the store | Entitlement validation |
| — | Name, email, contacts, photos, precise location, health data | Never collected | — |

There is no account, no analytics SDK and no crash reporter in 1.0.

---

## Apple — App Privacy

**Does this app collect data?** Yes.

### Identifiers → Device ID
- Collected: **Yes**
- Linked to the user: No
- **Used for tracking: Yes**
- Purposes: Third-Party Advertising, Analytics

### Usage Data → Advertising Data
- Collected: **Yes**
- Linked to the user: No
- Used for tracking: **Yes**
- Purposes: Third-Party Advertising

### Purchases → Purchase History
- Collected: **Yes**
- Linked to the user: No
- Used for tracking: No
- Purposes: App Functionality

### Diagnostics → Performance Data
- Collected: No

> "Used for tracking: Yes" is what obliges the App Tracking Transparency prompt.
> It is implemented in `src/monetization/ads.ts` and fires before the ads SDK
> initialises. Declaring tracking without showing the prompt is an automatic
> rejection.

**If you later ship a Pro-only build with no ads**, these answers change — keep
them in sync with the shipped binary, not with the intent.

---

## Google Play — Data Safety

**Does your app collect or share any of the required user data types?** Yes.

### Device or other IDs
- Collected: Yes · Shared: Yes (with Google, for advertising)
- Processed ephemerally: No
- Required or optional: Required for the free tier
- Purposes: Advertising or marketing, Analytics

### Financial info → Purchase history
- Collected: Yes · Shared: Yes (RevenueCat, as a processor)
- Purposes: App functionality

### App activity / Personal info / Location / Photos / Files
- Collected: **No** (habit data is stored only on the device)

### Security practices
- Data encrypted in transit: **Yes**
- Users can request deletion: **Yes** — all data is local; deleting the app
  deletes it, and *Settings → Delete all data* clears it in-app.
- Committed to the Play Families Policy: **No** (not a children's app)
- Independent security review: No

### Ads declaration
- Contains ads: **Yes**
- Target audience: 13+ — not designed for children.

---

## Keeping this honest

If you add cloud sync (P2), analytics, or a crash reporter, **both** declarations
change before that build ships. An out-of-date privacy declaration is one of the
few issues that can get an app pulled after it is already live.
