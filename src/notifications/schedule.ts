import type { Frequency } from '@/logic/frequency';

/**
 * Pure reminder scheduling maths.
 *
 * `expo-notifications` calendar triggers fire on the DEVICE's local wall clock,
 * which is exactly what a habit reminder wants: "remind me at 07:30" should
 * stay 07:30 after a flight or a DST change, not drift by the offset delta.
 * Keeping the trigger computation pure means the weekday mapping — the part
 * that is easy to get off by one — is covered by tests.
 */

export type ReminderTrigger =
  | { kind: 'daily'; hour: number; minute: number }
  /** `weekday` is 1 = Sunday … 7 = Saturday, per expo-notifications. */
  | { kind: 'weekly'; weekday: number; hour: number; minute: number };

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseReminderTime(
  value: string | null | undefined,
): { hour: number; minute: number } | null {
  if (!value) return null;
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function formatReminderTime(hour: number, minute: number): string {
  const h = Math.min(23, Math.max(0, Math.round(hour) || 0));
  const m = Math.min(59, Math.max(0, Math.round(minute) || 0));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * The set of repeating triggers that covers a habit's schedule.
 * Returns an empty array when nothing should be scheduled — a habit with no
 * due days, or a stored time we cannot trust.
 */
export function buildReminderTriggers(
  frequency: Frequency,
  time: string | null | undefined,
): ReminderTrigger[] {
  const parsed = parseReminderTime(time);
  if (!parsed) return [];
  const { hour, minute } = parsed;

  if (frequency.type === 'daily' || frequency.type === 'weekly') {
    return [{ kind: 'daily', hour, minute }];
  }

  if (frequency.days.length === 0) return [];
  if (frequency.days.length === 7) return [{ kind: 'daily', hour, minute }];

  return frequency.days
    .slice()
    .sort((a, b) => a - b)
    .map((day) => ({
      kind: 'weekly' as const,
      // JS `getDay()` is 0-indexed from Sunday; expo-notifications is 1-indexed.
      weekday: day + 1,
      hour,
      minute,
    }));
}

export function reminderTitle(habitName: string): string {
  return habitName.length > 40 ? `${habitName.slice(0, 39)}…` : habitName;
}

export function reminderBody(habitName: string): string {
  const name = reminderTitle(habitName);
  return `Time for ${name}. Keep the grid going.`;
}
