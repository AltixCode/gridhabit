import type { SqlDriver } from '@/db/driver';
import { createHabit, listHabits, setCompletion } from '@/db/repository';
import { addDays, type DateKey } from '@/logic/dates';

import { DEMO_HABITS, generateCompletionHistory } from './seed';

/**
 * Fills the database with the demo line-up. Development builds only — it is
 * reachable from Settings behind `__DEV__` and is what produces the populated
 * grid used for store screenshots and week-one dogfooding.
 */
export async function seedDemoData(db: SqlDriver, today: DateKey): Promise<void> {
  const existing = await listHabits(db, { includeArchived: true });
  if (existing.length > 0) {
    throw new Error('Database is not empty. Clear it before seeding demo data.');
  }

  for (const [index, demo] of DEMO_HABITS.entries()) {
    const habit = await createHabit(db, {
      name: demo.name,
      color: demo.color,
      icon: demo.icon,
      frequency: demo.frequency,
      createdAt: addDays(today, -demo.days),
    });

    const dates = generateCompletionHistory({
      frequency: demo.frequency,
      today,
      days: demo.days,
      adherence: demo.adherence,
      currentStreak: demo.currentStreak,
      seed: 1000 + index,
    });

    for (const date of dates) {
      await setCompletion(db, habit.id, date, true);
    }
  }
}

/** Removes every habit and completion. Development builds only. */
export async function clearAllData(db: SqlDriver): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM completions');
    await db.runAsync('DELETE FROM habits');
  });
}
