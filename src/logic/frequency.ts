import {
  WEEKDAY_LABELS,
  compareDateKeys,
  eachDayInRange,
  weekdayOf,
  type DateKey,
  type Weekday,
} from './dates';

/**
 * How often a habit is expected to be performed.
 *
 * - `daily`  — every calendar day.
 * - `custom` — only on the listed weekdays (0 = Sunday … 6 = Saturday).
 * - `weekly` — a quota of N completions per week, on any days the user likes.
 */
export type Frequency =
  | { type: 'daily' }
  | { type: 'weekly'; timesPerWeek: number }
  | { type: 'custom'; days: Weekday[] };

export const DAILY: Frequency = { type: 'daily' };

/** True when the habit is expected to be performed on `date`. */
export function isHabitDueOn(frequency: Frequency, date: DateKey): boolean {
  switch (frequency.type) {
    case 'daily':
      return true;
    case 'weekly':
      // A quota habit can be satisfied on any day, so every day is "available".
      return true;
    case 'custom':
      return frequency.days.includes(weekdayOf(date));
  }
}

/** Every due day between `from` and `to` inclusive; empty if the range is inverted. */
export function dueDaysInRange(
  frequency: Frequency,
  from: DateKey,
  to: DateKey,
): DateKey[] {
  if (compareDateKeys(from, to) > 0) return [];
  return eachDayInRange(from, to).filter((day) => isHabitDueOn(frequency, day));
}

function clampQuota(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(7, Math.max(1, n));
}

function normalizeDays(value: unknown): Weekday[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  for (const raw of value) {
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 0 && n <= 6) seen.add(n);
  }
  return [...seen].sort((a, b) => a - b) as Weekday[];
}

/** Serializes a frequency for the SQLite `habits.frequency` column. */
export function serializeFrequency(frequency: Frequency): string {
  return JSON.stringify(frequency);
}

/**
 * Parses a stored frequency. Always returns a usable value — a corrupt or
 * unknown encoding degrades to `daily` rather than crashing the habit list.
 */
export function parseFrequency(raw: string | null | undefined): Frequency {
  if (!raw) return DAILY;
  if (raw === 'daily') return DAILY;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DAILY;
  }
  if (typeof parsed !== 'object' || parsed === null) return DAILY;

  const candidate = parsed as { type?: unknown; timesPerWeek?: unknown; days?: unknown };
  switch (candidate.type) {
    case 'daily':
      return DAILY;
    case 'weekly':
      return { type: 'weekly', timesPerWeek: clampQuota(candidate.timesPerWeek) };
    case 'custom':
      return { type: 'custom', days: normalizeDays(candidate.days) };
    default:
      return DAILY;
  }
}

/** A short human label for the frequency, e.g. `Mon, Wed, Fri`. */
export function describeFrequency(frequency: Frequency): string {
  switch (frequency.type) {
    case 'daily':
      return 'Every day';
    case 'weekly':
      return `${frequency.timesPerWeek}× per week`;
    case 'custom': {
      if (frequency.days.length === 0) return 'No days selected';
      if (frequency.days.length === 7) return 'Every day';
      return frequency.days.map((d) => WEEKDAY_LABELS[d]).join(', ');
    }
  }
}

/** True when the frequency can never come due (a custom habit with no days). */
export function isNeverDue(frequency: Frequency): boolean {
  return frequency.type === 'custom' && frequency.days.length === 0;
}
