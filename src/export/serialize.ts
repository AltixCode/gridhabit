import type { Habit } from '@/db/types';
import { frequencyLabel } from '@/i18n/frequency';
import type { DateKey } from '@/logic/dates';

/**
 * Export serializers.
 *
 * "Your data stays yours" is a promise the paywall makes, so the export has to
 * be genuinely useful rather than a token dump: CSV opens in any spreadsheet,
 * and JSON carries everything a future import (or another app) would need.
 *
 * Both are pure string functions so the escaping rules — the part that quietly
 * corrupts a file months later — are fully covered by tests.
 */

export const EXPORT_SCHEMA_VERSION = 1;

export type ExportFormat = 'csv' | 'json';

export interface ExportInput {
  habits: readonly Habit[];
  /** habitId → completion dates, ascending. */
  completions: Readonly<Record<string, readonly DateKey[]>>;
  /** ISO timestamp of the export itself. */
  exportedAt: string;
}

const CSV_HEADER = 'habit_id,habit_name,frequency,color,archived,date';

/**
 * Escapes one CSV field.
 *
 * Beyond RFC 4180 quoting, a leading `=`, `+`, `-` or `@` is prefixed with an
 * apostrophe: spreadsheets treat those as formulas, so an exported habit named
 * `=HYPERLINK(...)` would execute when the user opens their own export. The
 * habit name is user input, which makes this a genuine injection sink.
 */
function csvField(value: string): string {
  const neutralised = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(neutralised)
    ? `"${neutralised.replace(/"/g, '""')}"`
    : neutralised;
}

export function toCsv({ habits, completions }: ExportInput): string {
  const lines: string[] = [CSV_HEADER];

  for (const habit of habits) {
    const prefix = [
      csvField(habit.id),
      csvField(habit.name),
      csvField(frequencyLabel(habit.frequency)),
      csvField(habit.color),
      String(habit.archived),
    ].join(',');

    const dates = completions[habit.id] ?? [];
    if (dates.length === 0) {
      // Keep the habit in the file even with no history, so the export is a
      // complete picture rather than only the days that happened to go well.
      lines.push(`${prefix},`);
      continue;
    }
    for (const date of dates) lines.push(`${prefix},${csvField(date)}`);
  }

  return `${lines.join('\n')}\n`;
}

export function toJson({ habits, completions, exportedAt }: ExportInput): string {
  return JSON.stringify(
    {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      app: 'GridHabit',
      exportedAt,
      habits: habits.map((habit) => ({
        id: habit.id,
        name: habit.name,
        color: habit.color,
        icon: habit.icon,
        frequency: habit.frequency,
        createdAt: habit.createdAt,
        archived: habit.archived,
        sortOrder: habit.sortOrder,
        completions: [...(completions[habit.id] ?? [])],
        // `reminderEnabled`, `reminderTime` and `notificationId` are deliberately
        // omitted: they describe OS-level schedules on one device and are
        // meaningless — or actively misleading — anywhere else.
      })),
    },
    null,
    2,
  );
}

export function exportFileName(format: ExportFormat, today: DateKey): string {
  return `gridhabit-${today}.${format}`;
}

export function mimeTypeFor(format: ExportFormat): string {
  return format === 'csv' ? 'text/csv' : 'application/json';
}
