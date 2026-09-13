import { isValidDateKey, type DateKey } from '@/logic/dates';
import { parseFrequency, serializeFrequency, type Frequency } from '@/logic/frequency';
import { createId } from '@/utils/id';

import type { SqlDriver, SqlParam } from './driver';
import type { CreateHabitInput, Habit, HabitRow, UpdateHabitInput } from './types';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const HABIT_COLUMNS = `id, name, color, icon, frequency, created_at, archived,
  sort_order, reminder_enabled, reminder_time, notification_id`;

function hydrate(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    frequency: parseFrequency(row.frequency),
    createdAt: row.created_at,
    archived: row.archived === 1,
    sortOrder: row.sort_order,
    reminderEnabled: row.reminder_enabled === 1,
    reminderTime: row.reminder_time,
    notificationId: row.notification_id,
  };
}

function assertName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error('Habit name cannot be empty.');
  if (trimmed.length > 60) throw new Error('Habit name cannot exceed 60 characters.');
  return trimmed;
}

function assertDateKey(value: string, label = 'date'): DateKey {
  if (!isValidDateKey(value)) {
    throw new Error(`Invalid ${label}: "${value}" — expected a local YYYY-MM-DD date.`);
  }
  return value;
}

function assertTime(value: string): string {
  if (!TIME_PATTERN.test(value)) {
    throw new Error(`Invalid reminder time: "${value}" — expected local HH:mm.`);
  }
  return value;
}

/* ------------------------------------------------------------------ habits */

export async function createHabit(
  db: SqlDriver,
  input: CreateHabitInput,
): Promise<Habit> {
  const name = assertName(input.name);
  const createdAt = assertDateKey(input.createdAt, 'createdAt date');
  const reminderTime = input.reminderTime ? assertTime(input.reminderTime) : null;

  const next = await db.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM habits',
  );
  const habit: Habit = {
    id: createId(),
    name,
    color: input.color,
    icon: input.icon ?? null,
    frequency: input.frequency,
    createdAt,
    archived: false,
    sortOrder: next?.next ?? 0,
    reminderEnabled: input.reminderEnabled ?? false,
    reminderTime,
    notificationId: null,
  };

  await db.runAsync(
    `INSERT INTO habits (${HABIT_COLUMNS})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      habit.id,
      habit.name,
      habit.color,
      habit.icon,
      serializeFrequency(habit.frequency),
      habit.createdAt,
      0,
      habit.sortOrder,
      habit.reminderEnabled ? 1 : 0,
      habit.reminderTime,
      null,
    ],
  );
  return habit;
}

export async function listHabits(
  db: SqlDriver,
  options: { includeArchived?: boolean } = {},
): Promise<Habit[]> {
  const where = options.includeArchived ? '' : 'WHERE archived = 0';
  const rows = await db.getAllAsync<HabitRow>(
    `SELECT ${HABIT_COLUMNS} FROM habits ${where} ORDER BY archived ASC, sort_order ASC`,
  );
  return rows.map(hydrate);
}

export async function getHabit(db: SqlDriver, id: string): Promise<Habit | null> {
  const row = await db.getFirstAsync<HabitRow>(
    `SELECT ${HABIT_COLUMNS} FROM habits WHERE id = ?`,
    [id],
  );
  return row ? hydrate(row) : null;
}

export async function updateHabit(
  db: SqlDriver,
  id: string,
  patch: UpdateHabitInput,
): Promise<void> {
  const sets: string[] = [];
  const params: SqlParam[] = [];

  const push = (column: string, value: SqlParam) => {
    sets.push(`${column} = ?`);
    params.push(value);
  };

  if (patch.name !== undefined) push('name', assertName(patch.name));
  if (patch.color !== undefined) push('color', patch.color);
  if (patch.icon !== undefined) push('icon', patch.icon);
  if (patch.frequency !== undefined) {
    push('frequency', serializeFrequency(patch.frequency as Frequency));
  }
  if (patch.archived !== undefined) push('archived', patch.archived ? 1 : 0);
  if (patch.reminderEnabled !== undefined) {
    push('reminder_enabled', patch.reminderEnabled ? 1 : 0);
  }
  if (patch.reminderTime !== undefined) {
    push('reminder_time', patch.reminderTime ? assertTime(patch.reminderTime) : null);
  }
  if (patch.notificationId !== undefined) push('notification_id', patch.notificationId);

  if (sets.length === 0) return;
  params.push(id);
  await db.runAsync(`UPDATE habits SET ${sets.join(', ')} WHERE id = ?`, params);
}

export function archiveHabit(db: SqlDriver, id: string): Promise<void> {
  return updateHabit(db, id, { archived: true });
}

export function unarchiveHabit(db: SqlDriver, id: string): Promise<void> {
  return updateHabit(db, id, { archived: false });
}

export async function deleteHabit(db: SqlDriver, id: string): Promise<void> {
  // Explicit child delete rather than relying on PRAGMA foreign_keys, which is
  // per-connection and silently off on some platforms.
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM completions WHERE habit_id = ?', [id]);
    await db.runAsync('DELETE FROM habits WHERE id = ?', [id]);
  });
}

export async function countActiveHabits(db: SqlDriver): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM habits WHERE archived = 0',
  );
  return row?.count ?? 0;
}

/** Persists an explicit habit order; ids not present are left untouched. */
export async function reorderHabits(db: SqlDriver, ids: readonly string[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (let index = 0; index < ids.length; index += 1) {
      await db.runAsync('UPDATE habits SET sort_order = ? WHERE id = ?', [
        index,
        ids[index] as string,
      ]);
    }
  });
}

/* ------------------------------------------------------------- completions */

async function assertHabitExists(db: SqlDriver, habitId: string): Promise<void> {
  const row = await db.getFirstAsync<{ id: string }>('SELECT id FROM habits WHERE id = ?', [
    habitId,
  ]);
  if (!row) throw new Error(`Unknown habit: "${habitId}".`);
}

/**
 * Marks `date` complete or incomplete for a habit. Returns the resulting state.
 * `date` must be a LOCAL calendar day — see `logic/dates`.
 */
export async function setCompletion(
  db: SqlDriver,
  habitId: string,
  date: DateKey,
  completed: boolean,
  now: Date = new Date(),
): Promise<boolean> {
  assertDateKey(date, 'completion date');
  await assertHabitExists(db, habitId);

  if (!completed) {
    await db.runAsync('DELETE FROM completions WHERE habit_id = ? AND date = ?', [
      habitId,
      date,
    ]);
    return false;
  }

  await db.runAsync(
    `INSERT INTO completions (id, habit_id, date, completed_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(habit_id, date) DO NOTHING`,
    [createId(), habitId, date, now.toISOString()],
  );
  return true;
}

/** Flips a day's completion state and returns the new state. */
export async function toggleCompletion(
  db: SqlDriver,
  habitId: string,
  date: DateKey,
  now: Date = new Date(),
): Promise<boolean> {
  const current = await isCompleted(db, habitId, date);
  return setCompletion(db, habitId, date, !current, now);
}

export async function isCompleted(
  db: SqlDriver,
  habitId: string,
  date: DateKey,
): Promise<boolean> {
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM completions WHERE habit_id = ? AND date = ?',
    [habitId, date],
  );
  return row !== null;
}

export async function listCompletionDates(
  db: SqlDriver,
  habitId: string,
  from?: DateKey,
  to?: DateKey,
): Promise<DateKey[]> {
  const clauses = ['habit_id = ?'];
  const params: SqlParam[] = [habitId];
  if (from) {
    clauses.push('date >= ?');
    params.push(from);
  }
  if (to) {
    clauses.push('date <= ?');
    params.push(to);
  }
  const rows = await db.getAllAsync<{ date: string }>(
    `SELECT date FROM completions WHERE ${clauses.join(' AND ')} ORDER BY date ASC`,
    params,
  );
  return rows.map((r) => r.date);
}

/**
 * Loads completions for many habits in a SINGLE query.
 *
 * The home screen renders a mini grid per habit; fetching per habit would be a
 * textbook N+1 that grows with the user's habit count. One indexed range scan
 * over `(habit_id, date)` serves the whole list instead.
 */
export async function listCompletionDatesForHabits(
  db: SqlDriver,
  habitIds: readonly string[],
  from: DateKey,
  to: DateKey,
): Promise<Map<string, DateKey[]>> {
  const result = new Map<string, DateKey[]>();
  if (habitIds.length === 0) return result;
  for (const id of habitIds) result.set(id, []);

  const placeholders = habitIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<{ habit_id: string; date: string }>(
    `SELECT habit_id, date FROM completions
     WHERE habit_id IN (${placeholders}) AND date >= ? AND date <= ?
     ORDER BY habit_id ASC, date ASC`,
    [...habitIds, from, to],
  );

  for (const row of rows) {
    result.get(row.habit_id)?.push(row.date);
  }
  return result;
}
