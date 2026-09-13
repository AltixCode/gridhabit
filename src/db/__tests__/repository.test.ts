/**
 * @jest-environment node
 */
import { CURRENT_SCHEMA_VERSION, migrate } from '../schema';
import {
  archiveHabit,
  countActiveHabits,
  createHabit,
  deleteHabit,
  getHabit,
  isCompleted,
  listCompletionDates,
  listCompletionDatesForHabits,
  listAllCompletionDates,
  listHabits,
  reorderHabits,
  setCompletion,
  toggleCompletion,
  unarchiveHabit,
  updateHabit,
} from '../repository';
import { createTestDriver } from './testDriver';

type Driver = ReturnType<typeof createTestDriver>;

let db: Driver;

beforeEach(async () => {
  db = createTestDriver();
  await migrate(db);
});

afterEach(() => {
  db.close();
});

const base = {
  name: 'Meditate',
  color: '#7C5CFF',
  icon: 'leaf',
  frequency: { type: 'daily' } as const,
  createdAt: '2026-09-01',
};

describe('migrate', () => {
  it('brings a fresh database to the current schema version', async () => {
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('is idempotent — running it again changes nothing', async () => {
    await createHabit(db, base);
    await migrate(db);
    await expect(listHabits(db)).resolves.toHaveLength(1);
  });

  it('creates the habits and completions tables', async () => {
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'",
    );
    const names = tables.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['habits', 'completions']));
  });

  it('indexes completions by habit and date for range queries', async () => {
    const indexes = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='completions'",
    );
    expect(indexes.length).toBeGreaterThan(0);
  });
});

describe('createHabit', () => {
  it('returns the stored habit with a generated id', async () => {
    const habit = await createHabit(db, base);
    expect(habit.id).toEqual(expect.any(String));
    expect(habit.id.length).toBeGreaterThan(8);
    expect(habit).toMatchObject({
      name: 'Meditate',
      color: '#7C5CFF',
      icon: 'leaf',
      archived: false,
      createdAt: '2026-09-01',
    });
    expect(habit.frequency).toEqual({ type: 'daily' });
  });

  it('generates distinct ids', async () => {
    const a = await createHabit(db, base);
    const b = await createHabit(db, { ...base, name: 'Read' });
    expect(a.id).not.toBe(b.id);
  });

  it('trims whitespace from the name', async () => {
    const habit = await createHabit(db, { ...base, name: '  Run  ' });
    expect(habit.name).toBe('Run');
  });

  it('rejects an empty name', async () => {
    await expect(createHabit(db, { ...base, name: '   ' })).rejects.toThrow(/name/i);
  });

  it('rejects an invalid createdAt', async () => {
    await expect(createHabit(db, { ...base, createdAt: '01/09/2026' })).rejects.toThrow(
      /date/i,
    );
  });

  it('appends each new habit to the end of the sort order', async () => {
    const a = await createHabit(db, base);
    const b = await createHabit(db, { ...base, name: 'Read' });
    const c = await createHabit(db, { ...base, name: 'Run' });
    expect((await listHabits(db)).map((h) => h.id)).toEqual([a.id, b.id, c.id]);
  });

  it('round-trips a custom frequency', async () => {
    const habit = await createHabit(db, {
      ...base,
      frequency: { type: 'custom', days: [1, 3, 5] },
    });
    const reloaded = await getHabit(db, habit.id);
    expect(reloaded?.frequency).toEqual({ type: 'custom', days: [1, 3, 5] });
  });
});

describe('listHabits / getHabit', () => {
  it('returns an empty array for a fresh database', async () => {
    await expect(listHabits(db)).resolves.toEqual([]);
  });

  it('excludes archived habits by default', async () => {
    const a = await createHabit(db, base);
    await createHabit(db, { ...base, name: 'Read' });
    await archiveHabit(db, a.id);
    expect((await listHabits(db)).map((h) => h.name)).toEqual(['Read']);
  });

  it('includes archived habits on request', async () => {
    const a = await createHabit(db, base);
    await archiveHabit(db, a.id);
    expect(await listHabits(db, { includeArchived: true })).toHaveLength(1);
  });

  it('returns null for an unknown id', async () => {
    await expect(getHabit(db, 'nope')).resolves.toBeNull();
  });
});

describe('updateHabit', () => {
  it('applies a partial patch and leaves other fields alone', async () => {
    const habit = await createHabit(db, base);
    await updateHabit(db, habit.id, { name: 'Meditate 10m', color: '#FF6B6B' });
    const reloaded = await getHabit(db, habit.id);
    expect(reloaded).toMatchObject({
      name: 'Meditate 10m',
      color: '#FF6B6B',
      icon: 'leaf',
    });
  });

  it('updates the frequency', async () => {
    const habit = await createHabit(db, base);
    await updateHabit(db, habit.id, { frequency: { type: 'weekly', timesPerWeek: 3 } });
    expect((await getHabit(db, habit.id))?.frequency).toEqual({
      type: 'weekly',
      timesPerWeek: 3,
    });
  });

  it('rejects an empty name', async () => {
    const habit = await createHabit(db, base);
    await expect(updateHabit(db, habit.id, { name: '  ' })).rejects.toThrow(/name/i);
  });

  it('is a no-op when the patch is empty', async () => {
    const habit = await createHabit(db, base);
    await expect(updateHabit(db, habit.id, {})).resolves.toBeUndefined();
    expect((await getHabit(db, habit.id))?.name).toBe('Meditate');
  });

  it('stores reminder settings', async () => {
    const habit = await createHabit(db, base);
    await updateHabit(db, habit.id, { reminderEnabled: true, reminderTime: '07:30' });
    expect(await getHabit(db, habit.id)).toMatchObject({
      reminderEnabled: true,
      reminderTime: '07:30',
    });
  });

  it('rejects a malformed reminder time', async () => {
    const habit = await createHabit(db, base);
    await expect(updateHabit(db, habit.id, { reminderTime: '7am' })).rejects.toThrow(
      /time/i,
    );
  });
});

describe('archive / unarchive / delete', () => {
  it('round-trips the archived flag', async () => {
    const habit = await createHabit(db, base);
    await archiveHabit(db, habit.id);
    expect((await getHabit(db, habit.id))?.archived).toBe(true);
    await unarchiveHabit(db, habit.id);
    expect((await getHabit(db, habit.id))?.archived).toBe(false);
  });

  it('preserves completion history through an archive round-trip', async () => {
    const habit = await createHabit(db, base);
    await setCompletion(db, habit.id, '2026-09-02', true);
    await archiveHabit(db, habit.id);
    await unarchiveHabit(db, habit.id);
    expect(await listCompletionDates(db, habit.id)).toEqual(['2026-09-02']);
  });

  it('deletes the habit and cascades its completions', async () => {
    const habit = await createHabit(db, base);
    await setCompletion(db, habit.id, '2026-09-02', true);
    await deleteHabit(db, habit.id);
    expect(await getHabit(db, habit.id)).toBeNull();
    const rows = await db.getAllAsync<{ c: number }>(
      'SELECT COUNT(*) AS c FROM completions',
    );
    expect(rows[0]?.c).toBe(0);
  });
});

describe('countActiveHabits', () => {
  it('counts only unarchived habits — the paywall gate depends on it', async () => {
    const a = await createHabit(db, base);
    await createHabit(db, { ...base, name: 'Read' });
    expect(await countActiveHabits(db)).toBe(2);
    await archiveHabit(db, a.id);
    expect(await countActiveHabits(db)).toBe(1);
  });
});

describe('reorderHabits', () => {
  it('persists an explicit order', async () => {
    const a = await createHabit(db, base);
    const b = await createHabit(db, { ...base, name: 'Read' });
    const c = await createHabit(db, { ...base, name: 'Run' });
    await reorderHabits(db, [c.id, a.id, b.id]);
    expect((await listHabits(db)).map((h) => h.id)).toEqual([c.id, a.id, b.id]);
  });

  it('ignores unknown ids without throwing', async () => {
    const a = await createHabit(db, base);
    await expect(reorderHabits(db, ['ghost', a.id])).resolves.toBeUndefined();
    expect(await listHabits(db)).toHaveLength(1);
  });
});

describe('completions', () => {
  it('marks a day complete and reports it', async () => {
    const habit = await createHabit(db, base);
    await setCompletion(db, habit.id, '2026-09-10', true);
    expect(await isCompleted(db, habit.id, '2026-09-10')).toBe(true);
    expect(await isCompleted(db, habit.id, '2026-09-11')).toBe(false);
  });

  it('is idempotent — completing the same day twice stores one row', async () => {
    const habit = await createHabit(db, base);
    await setCompletion(db, habit.id, '2026-09-10', true);
    await setCompletion(db, habit.id, '2026-09-10', true);
    expect(await listCompletionDates(db, habit.id)).toEqual(['2026-09-10']);
  });

  it('un-completing a day removes it', async () => {
    const habit = await createHabit(db, base);
    await setCompletion(db, habit.id, '2026-09-10', true);
    await setCompletion(db, habit.id, '2026-09-10', false);
    expect(await listCompletionDates(db, habit.id)).toEqual([]);
  });

  it('un-completing a day that was never completed is a no-op', async () => {
    const habit = await createHabit(db, base);
    await expect(setCompletion(db, habit.id, '2026-09-10', false)).resolves.toBe(false);
  });

  it('toggleCompletion flips state and returns the new value', async () => {
    const habit = await createHabit(db, base);
    expect(await toggleCompletion(db, habit.id, '2026-09-10')).toBe(true);
    expect(await toggleCompletion(db, habit.id, '2026-09-10')).toBe(false);
    expect(await toggleCompletion(db, habit.id, '2026-09-10')).toBe(true);
  });

  it('rejects a non-local-date completion key', async () => {
    const habit = await createHabit(db, base);
    await expect(
      setCompletion(db, habit.id, '2026-09-10T00:00:00Z', true),
    ).rejects.toThrow(/date/i);
  });

  it('rejects a completion for an unknown habit', async () => {
    await expect(setCompletion(db, 'ghost', '2026-09-10', true)).rejects.toThrow(
      /habit/i,
    );
  });

  it('returns dates in ascending order', async () => {
    const habit = await createHabit(db, base);
    for (const d of ['2026-09-12', '2026-09-10', '2026-09-11']) {
      await setCompletion(db, habit.id, d, true);
    }
    expect(await listCompletionDates(db, habit.id)).toEqual([
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
    ]);
  });

  it('filters to an inclusive date range', async () => {
    const habit = await createHabit(db, base);
    for (const d of ['2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12']) {
      await setCompletion(db, habit.id, d, true);
    }
    expect(await listCompletionDates(db, habit.id, '2026-09-10', '2026-09-11')).toEqual([
      '2026-09-10',
      '2026-09-11',
    ]);
  });

  it('keeps each habit’s completions separate', async () => {
    const a = await createHabit(db, base);
    const b = await createHabit(db, { ...base, name: 'Read' });
    await setCompletion(db, a.id, '2026-09-10', true);
    expect(await listCompletionDates(db, b.id)).toEqual([]);
  });
});

describe('listCompletionDatesForHabits', () => {
  it('loads every habit in ONE query — no N+1 on the home screen', async () => {
    const a = await createHabit(db, base);
    const b = await createHabit(db, { ...base, name: 'Read' });
    await setCompletion(db, a.id, '2026-09-10', true);
    await setCompletion(db, a.id, '2026-09-11', true);
    await setCompletion(db, b.id, '2026-09-11', true);

    const spy = jest.spyOn(db, 'getAllAsync');
    const map = await listCompletionDatesForHabits(db, [a.id, b.id], '2026-01-01', '2026-12-31');
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();

    expect(map.get(a.id)).toEqual(['2026-09-10', '2026-09-11']);
    expect(map.get(b.id)).toEqual(['2026-09-11']);
  });

  it('returns an entry for every requested habit, even with no completions', async () => {
    const a = await createHabit(db, base);
    const map = await listCompletionDatesForHabits(db, [a.id], '2026-01-01', '2026-12-31');
    expect(map.get(a.id)).toEqual([]);
  });

  it('returns an empty map and issues no query for an empty id list', async () => {
    const spy = jest.spyOn(db, 'getAllAsync');
    const map = await listCompletionDatesForHabits(db, [], '2026-01-01', '2026-12-31');
    expect(map.size).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('listAllCompletionDates', () => {
  it('groups every completion by habit in one query', async () => {
    const a = await createHabit(db, base);
    const b = await createHabit(db, { ...base, name: 'Read' });
    await setCompletion(db, a.id, '2026-09-11', true);
    await setCompletion(db, a.id, '2026-09-10', true);
    await setCompletion(db, b.id, '2026-09-10', true);

    const spy = jest.spyOn(db, 'getAllAsync');
    const map = await listAllCompletionDates(db);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();

    expect(map.get(a.id)).toEqual(['2026-09-10', '2026-09-11']);
    expect(map.get(b.id)).toEqual(['2026-09-10']);
  });

  it('omits habits with no completions', async () => {
    const a = await createHabit(db, base);
    const map = await listAllCompletionDates(db);
    expect(map.has(a.id)).toBe(false);
  });

  it('is empty for a fresh database', async () => {
    await expect(listAllCompletionDates(db)).resolves.toEqual(new Map());
  });
});
