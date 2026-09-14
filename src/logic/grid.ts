import {
  MONTH_LABELS,
  addDays,
  compareDateKeys,
  isValidDateKey,
  parseDateKey,
  startOfWeek,
  weekdayOf,
  type DateKey,
  type Weekday,
} from './dates';
import { isHabitDueOn, type Frequency } from './frequency';

/** One day in the contribution grid. */
export interface GridCell {
  date: DateKey;
  weekday: Weekday;
  /** The habit was logged on this day. */
  completed: boolean;
  /** The habit was expected on this day. */
  isDue: boolean;
  isToday: boolean;
  /** After today — rendered as an empty placeholder. */
  isFuture: boolean;
  /** Before the habit existed — rendered as an empty placeholder. */
  isBeforeStart: boolean;
  /** In range, in the past, due, and not completed. */
  isMissed: boolean;
  /**
   * 0…1 fill strength for a completed cell, derived from how long the run of
   * consecutive completions ending on this day is. Momentum becomes visible:
   * a long streak reads as a solid block, a scattered week as pale specks.
   */
  intensity: number;
}

export interface GridOptions {
  today: DateKey;
  createdAt: DateKey;
  frequency: Frequency;
  /** Number of week columns to render; the last column contains `today`. */
  weeks: number;
  weekStartsOn?: Weekday;
}

/** A grid is an array of week columns, each holding exactly 7 day cells. */
export type ContributionGrid = GridCell[][];

/**
 * Builds the GitHub-style contribution grid: `weeks` columns of 7 rows, with
 * the column containing `today` last. Cells outside the habit's lifetime are
 * still emitted (so every column is 7 tall) but flagged so the renderer can
 * draw them as empty placeholders.
 */
export function buildContributionGrid(
  completions: readonly DateKey[],
  options: GridOptions,
): ContributionGrid {
  const { today, createdAt, frequency } = options;
  const weekStartsOn = options.weekStartsOn ?? 0;
  const weeks = Math.max(1, Math.floor(options.weeks) || 1);

  const done = new Set<DateKey>();
  for (const date of completions) {
    if (isValidDateKey(date)) done.add(date);
  }

  const lastColumnStart = startOfWeek(today, weekStartsOn);
  const firstColumnStart = addDays(lastColumnStart, -(weeks - 1) * 7);

  const grid: ContributionGrid = [];
  let columnStart = firstColumnStart;

  for (let week = 0; week < weeks; week += 1) {
    const column: GridCell[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(columnStart, offset);
      const isToday = date === today;
      const isFuture = compareDateKeys(date, today) > 0;
      const isBeforeStart = compareDateKeys(date, createdAt) < 0;
      const isDue = isHabitDueOn(frequency, date);
      const completed = done.has(date);
      column.push({
        date,
        weekday: weekdayOf(date),
        completed,
        isDue,
        isToday,
        isFuture,
        isBeforeStart,
        isMissed: isDue && !completed && !isFuture && !isToday && !isBeforeStart,
        intensity: 0,
      });
    }
    grid.push(column);
    columnStart = addDays(columnStart, 7);
  }

  return applyIntensity(grid, done);
}

/** Fill strength for a run of `length` consecutive completions. */
export function intensityForRun(length: number): number {
  if (length <= 0) return 0;
  if (length === 1) return 0.45;
  if (length <= 3) return 0.65;
  if (length <= 6) return 0.82;
  return 1;
}

/**
 * Assigns each completed cell an intensity from the length of the completion
 * run ending on that day. The run is measured against the full completion set,
 * not just the visible window, so the leftmost column of a 52-week grid is not
 * artificially dimmed.
 */
export function applyIntensity(
  grid: ContributionGrid,
  completions: ReadonlySet<DateKey>,
): ContributionGrid {
  return grid.map((column) =>
    column.map((cell) => {
      if (!cell.completed) return cell;
      let run = 0;
      let cursor = cell.date;
      while (completions.has(cursor)) {
        run += 1;
        cursor = addDays(cursor, -1);
      }
      return { ...cell, intensity: intensityForRun(run) };
    }),
  );
}

/**
 * A month label per column, blank except on the first column of each month —
 * the sparse axis labelling GitHub uses.
 */
export function gridMonthLabels(grid: ContributionGrid): string[] {
  let previousMonth = -1;
  return grid.map((column) => {
    const first = column[0];
    if (!first) return '';
    const month = parseDateKey(first.date).getMonth();
    if (month === previousMonth) return '';
    previousMonth = month;
    return MONTH_LABELS[month] ?? '';
  });
}
