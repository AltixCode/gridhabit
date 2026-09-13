# Screenshot plan

Screenshots are the highest-leverage asset in this project. A habit tracker is
bought from the store page, and the grid is the only thing that differentiates
GridHabit from four mature competitors.

## Non-negotiable rule

**Never capture from a fresh install.** Build a development client, open
*Settings → Developer → Seed demo data*, and capture from the seeded state. The
seeder is deterministic (`src/dev/seed.ts`), so any screenshot can be
regenerated identically later.

## Shot list

| # | Screen | Caption | Why |
|---|---|---|---|
| 1 | Habit detail, 52-week grid, long streak | **A year of consistency, on one screen** | The hook. This shot alone decides most installs. |
| 2 | Today list, 5 habits, mixed progress | **Open it. Tap. Done.** | Shows the daily loop is trivially fast. |
| 3 | Habit detail stats row | **Streaks that survive a missed day** | Speaks to the frustration with brittle competitors. |
| 4 | Create-habit form | **Daily, a few times a week, or your own days** | Answers the "will it fit my routine" objection. |
| 5 | Today list in dark mode | **Looks right at 6am and at midnight** | Dark mode is table stakes; show it rather than claim it. |
| 6 | Paywall | **One payment. No ads, forever.** | Sets the price expectation before the install. |

Six shots, in that order. Shot 1 must be first on both stores.

## Capture

```bash
# iOS simulator screenshots at the exact required resolution
xcrun simctl io booted screenshot shot-1.png
```

| Store | Required sizes |
|---|---|
| App Store | 6.9" — 1290×2796 (iPhone 16 Pro Max) **and** 6.5" — 1242×2688 |
| Play | Phone 1080×1920 or larger, 2–8 shots |
| Play | Feature graphic 1024×500 (no screenshot content, just the grid motif + name) |

Icon: 1024×1024 PNG, **no alpha channel, no rounded corners** — Apple applies
the mask and rejects pre-rounded icons.

## Style

- Light mode for shots 1–4 and 6, dark for shot 5.
- Captions above the device frame on a solid background drawn from the palette
  (`#F7F7F5` light / `#0B0B0C` dark). No gradients, no 3D perspective mockups.
- One idea per shot. Caption under 6 words.
- No lorem ipsum, no placeholder habit names — use the demo line-up
  (Meditate, Read 20 pages, Strength training, Long walk, No screens after 10).
