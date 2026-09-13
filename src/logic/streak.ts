import {
  addDays,
  compareDateKeys,
  isValidDateKey,
  startOfWeek,
  type DateKey,
  type Weekday,
} from './dates';
import { dueDaysInRange, isHabitDueOn, isNeverDue, type Frequency } from './frequency';

export interface HabitSummary {
  currentStreak: number;
  longestStreak: number;
  /** 0…1 share of due days completed since the habit was created. */
  completionRate: number;
  totalCompletions: number;
  isCompletedToday: boolean;
  isDueToday: boolean;
}

/**
 * Normalizes raw completion dates into a sorted, de-duplicated set of valid
 * keys, optionally dropping anything after `upTo`. Completions dated in the
 * future (clock skew, a device timezone change) must never inflate a streak.
 */
function normalize(dates: readonly DateKey[], upTo?: DateKey): DateKey[] {
  const seen = new Set<DateKey>();
  for (const date of dates) {
    if (!isValidDateKey(date)) continue;
    if (upTo && compareDateKeys(date, upTo) > 0) continue;
    seen.add(date);
  }
  return [...seen].sort(compareDateKeys);
}

function countByWeek(
  dates: readonly DateKey[],
  weekStartsOn: Weekday,
): Map<DateKey, number> {
  const counts = new Map<DateKey, number>();
  for (const date of dates) {
    const week = startOfWeek(date, weekStartsOn);
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }
  return counts;
}

function currentWeeklyStreak(
  sorted: DateKey[],
  quota: number,
  today: DateKey,
  weekStartsOn: Weekday,
): number {
  const counts = countByWeek(sorted, weekStartsOn);
  const floorWeek = startOfWeek(sorted[0]!, weekStartsOn);
  const thisWeek = startOfWeek(today, weekStartsOn);

  // The current week is still in progress: falling short of the quota so far
  // is not yet a miss, so start counting from last week instead.
  let cursor =
    (counts.get(thisWeek) ?? 0) >= quota ? thisWeek : addDays(thisWeek, -7);

  let streak = 0;
  while (compareDateKeys(cursor, floorWeek) >= 0) {
    if ((counts.get(cursor) ?? 0) < quota) break;
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

/**
 * The current consecutive streak, in days for `daily`/`custom` habits and in
 * weeks for a `weekly` quota habit.
 *
 * Today is treated with grace: a due day that has not ended yet does not break
 * the streak, it simply does not extend it.
 */
export function calculateStreak(
  completions: readonly DateKey[],
  frequency: Frequency,
  today: DateKey,
  weekStartsOn: Weekday = 0,
): number {
  if (isNeverDue(frequency)) return 0;
  const sorted = normalize(completions, today);
  if (sorted.length === 0) return 0;

  if (frequency.type === 'weekly') {
    return currentWeeklyStreak(sorted, frequency.timesPerWeek, today, weekStartsOn);
  }

  const done = new Set(sorted);
  const floor = sorted[0]!;

  // Grace: if today is due but not yet logged, anchor on yesterday.
  let cursor = isHabitDueOn(frequency, today) && !done.has(today)
    ? addDays(today, -1)
    : today;

  let streak = 0;
  while (compareDateKeys(cursor, floor) >= 0) {
    if (isHabitDueOn(frequency, cursor)) {
      if (!done.has(cursor)) break;
      streak += 1;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** The longest streak ever achieved, in the same units as `calculateStreak`. */
export function calculateLongestStreak(
  completions: readonly DateKey[],
  frequency: Frequency,
  weekStartsOn: Weekday = 0,
): number {
  if (isNeverDue(frequency)) return 0;
  const sorted = normalize(completions);
  if (sorted.length === 0) return 0;

  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;

  if (frequency.type === 'weekly') {
    const counts = countByWeek(sorted, weekStartsOn);
    let cursor = startOfWeek(first, weekStartsOn);
    const lastWeek = startOfWeek(last, weekStartsOn);
    let run = 0;
    let best = 0;
    while (compareDateKeys(cursor, lastWeek) <= 0) {
      run = (counts.get(cursor) ?? 0) >= frequency.timesPerWeek ? run + 1 : 0;
      best = Math.max(best, run);
      cursor = addDays(cursor, 7);
    }
    return best;
  }

  const done = new Set(sorted);
  let cursor = first;
  let run = 0;
  let best = 0;
  while (compareDateKeys(cursor, last) <= 0) {
    if (isHabitDueOn(frequency, cursor)) {
      run = done.has(cursor) ? run + 1 : 0;
      best = Math.max(best, run);
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

/**
 * Share of expected completions actually logged between `createdAt` and
 * `today`, inclusive. Returns 0 when nothing has come due yet — an unmeasured
 * habit reads better as 0% than as a misleading 100%.
 */
export function calculateCompletionRate(
  completions: readonly DateKey[],
  frequency: Frequency,
  createdAt: DateKey,
  today: DateKey,
  weekStartsOn: Weekday = 0,
): number {
  const sorted = normalize(completions, today);

  if (frequency.type === 'weekly') {
    const weeks = new Set<DateKey>();
    let cursor = startOfWeek(createdAt, weekStartsOn);
    const lastWeek = startOfWeek(today, weekStartsOn);
    while (compareDateKeys(cursor, lastWeek) <= 0) {
      weeks.add(cursor);
      cursor = addDays(cursor, 7);
    }
    const expected = weeks.size * frequency.timesPerWeek;
    if (expected === 0) return 0;
    const logged = sorted.filter(
      (d) => compareDateKeys(d, createdAt) >= 0 && weeks.has(startOfWeek(d, weekStartsOn)),
    ).length;
    return Math.min(1, logged / expected);
  }

  const dueDays = dueDaysInRange(frequency, createdAt, today);
  if (dueDays.length === 0) return 0;
  const done = new Set(sorted);
  const completed = dueDays.filter((day) => done.has(day)).length;
  return Math.min(1, completed / dueDays.length);
}

/** Every stat the detail screen needs, computed in one pass over the data. */
export function summarizeHabit(
  completions: readonly DateKey[],
  frequency: Frequency,
  createdAt: DateKey,
  today: DateKey,
  weekStartsOn: Weekday = 0,
): HabitSummary {
  const sorted = normalize(completions, today);
  return {
    currentStreak: calculateStreak(completions, frequency, today, weekStartsOn),
    longestStreak: calculateLongestStreak(completions, frequency, weekStartsOn),
    completionRate: calculateCompletionRate(
      completions,
      frequency,
      createdAt,
      today,
      weekStartsOn,
    ),
    totalCompletions: sorted.length,
    isCompletedToday: sorted.includes(today),
    isDueToday: !isNeverDue(frequency) && isHabitDueOn(frequency, today),
  };
}
