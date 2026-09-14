/**
 * Local-calendar date utilities.
 *
 * Every "day" in GridHabit is the user's LOCAL calendar day, represented as a
 * `YYYY-MM-DD` string (a `DateKey`). We deliberately never store or reason
 * about UTC instants for day-level questions: a user in Auckland who logs a
 * habit at 09:00 local is logging it for their local date, and a user who
 * crosses a DST boundary must not lose or gain a day in their streak.
 *
 * The two rules that make this safe:
 *   1. A `DateKey` is produced from local getters (`getFullYear`/`getMonth`/
 *      `getDate`), never from `toISOString()`.
 *   2. A `DateKey` is parsed back to local NOON, so a ±1h DST shift can never
 *      push the `Date` across a midnight boundary.
 */

/** A local calendar day in `YYYY-MM-DD` form. */
export type DateKey = string;

/** 0 = Sunday … 6 = Saturday, matching `Date.prototype.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Formats a `Date` as the local calendar day it falls on. */
export function dateKeyFromDate(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The local calendar day for `now` (defaults to the current instant). */
export function todayKey(now: Date = new Date()): DateKey {
  return dateKeyFromDate(now);
}

function splitKey(key: string): [number, number, number] | null {
  if (!DATE_KEY_PATTERN.test(key)) return null;
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const day = Number(key.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Reject dates that roll over (e.g. 2026-02-30).
  const probe = new Date(year, month - 1, day, 12);
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    return null;
  }
  return [year, month, day];
}

/** True when `key` is a well-formed, real calendar date. */
export function isValidDateKey(key: string): boolean {
  return splitKey(key) !== null;
}

/**
 * Parses a `DateKey` into a local `Date` pinned to 12:00 noon. Noon keeps the
 * value at least 11 hours away from either midnight, so no DST offset change
 * can shift it onto a different calendar day.
 */
export function parseDateKey(key: DateKey): Date {
  const parts = splitKey(key);
  if (!parts) throw new Error(`Invalid date key: "${key}"`);
  const [year, month, day] = parts;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/** Adds (or subtracts, for negative `amount`) whole calendar days. */
export function addDays(key: DateKey, amount: number): DateKey {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + amount);
  return dateKeyFromDate(date);
}

/**
 * Whole calendar days from `from` to `to`; negative when `to` precedes `from`.
 * Computed in UTC space so DST offset changes cannot introduce a ±1 error.
 */
export function daysBetween(from: DateKey, to: DateKey): number {
  const a = splitKey(from);
  const b = splitKey(to);
  if (!a || !b) throw new Error(`Invalid date key: "${!a ? from : to}"`);
  const fromUtc = Date.UTC(a[0], a[1] - 1, a[2]);
  const toUtc = Date.UTC(b[0], b[1] - 1, b[2]);
  return Math.round((toUtc - fromUtc) / MS_PER_DAY);
}

/** The day of the week `key` falls on. */
export function weekdayOf(key: DateKey): Weekday {
  return parseDateKey(key).getDay() as Weekday;
}

/** The first day of the week containing `key`. */
export function startOfWeek(key: DateKey, weekStartsOn: Weekday = 0): DateKey {
  const offset = (weekdayOf(key) - weekStartsOn + 7) % 7;
  return addDays(key, -offset);
}

/** The last day of the week containing `key`. */
export function endOfWeek(key: DateKey, weekStartsOn: Weekday = 0): DateKey {
  return addDays(startOfWeek(key, weekStartsOn), 6);
}

/** `Array.prototype.sort` comparator; `DateKey`s sort chronologically as text. */
export function compareDateKeys(a: DateKey, b: DateKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Every day from `from` to `to` inclusive; empty when the range is inverted. */
export function eachDayInRange(from: DateKey, to: DateKey): DateKey[] {
  if (compareDateKeys(from, to) > 0) return [];
  const out: DateKey[] = [];
  let cursor = from;
  while (compareDateKeys(cursor, to) <= 0) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** A human label such as `Sun, Sep 13, 2026`. */
export function formatDateKeyLong(key: DateKey): string {
  const date = parseDateKey(key);
  return `${WEEKDAY_LABELS[date.getDay()]}, ${MONTH_LABELS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
