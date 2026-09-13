/**
 * @jest-environment node
 */
import { migrate } from '@/db/schema';
import { createTestDriver } from '@/db/__tests__/testDriver';
import { listCompletionDates } from '@/db/repository';

import { selectActiveHabits, selectArchivedHabits, useHabitsStore } from '../useHabitsStore';

type Driver = ReturnType<typeof createTestDriver>;

let db: Driver;

const base = {
  name: 'Meditate',
  color: '#7C5CFF',
  icon: null,
  frequency: { type: 'daily' } as const,
  createdAt: '2026-09-01',
};

beforeEach(async () => {
  db = createTestDriver();
  await migrate(db);
  useHabitsStore.setState({ habits: [], completions: {}, status: 'idle', error: null });
});

afterEach(() => db.close());

describe('load', () => {
  it('hydrates habits and completions and reports ready', async () => {
    const habit = await useHabitsStore.getState().addHabit(db, base);
    await useHabitsStore.getState().setCompletion(db, habit.id, '2026-09-10', true);

    useHabitsStore.setState({ habits: [], completions: {} });
    await useHabitsStore.getState().load(db);

    const state = useHabitsStore.getState();
    expect(state.status).toBe('ready');
    expect(state.habits).toHaveLength(1);
    expect(state.completions[habit.id]).toEqual(['2026-09-10']);
  });

  it('records an error status when the database is unusable', async () => {
    const broken = {
      ...db,
      getAllAsync: jest.fn().mockRejectedValue(new Error('disk I/O error')),
    };
    await useHabitsStore.getState().load(broken);
    expect(useHabitsStore.getState().status).toBe('error');
    expect(useHabitsStore.getState().error).toMatch(/disk I\/O/);
  });
});

describe('setCompletion', () => {
  it('updates the store and persists to SQLite', async () => {
    const habit = await useHabitsStore.getState().addHabit(db, base);
    await useHabitsStore.getState().setCompletion(db, habit.id, '2026-09-12', true);

    expect(useHabitsStore.getState().completions[habit.id]).toEqual(['2026-09-12']);
    await expect(listCompletionDates(db, habit.id)).resolves.toEqual(['2026-09-12']);
  });

  it('keeps dates sorted regardless of insertion order', async () => {
    const habit = await useHabitsStore.getState().addHabit(db, base);
    for (const date of ['2026-09-12', '2026-09-10', '2026-09-11']) {
      await useHabitsStore.getState().setCompletion(db, habit.id, date, true);
    }
    expect(useHabitsStore.getState().completions[habit.id]).toEqual([
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
    ]);
  });

  it('is idempotent', async () => {
    const habit = await useHabitsStore.getState().addHabit(db, base);
    await useHabitsStore.getState().setCompletion(db, habit.id, '2026-09-12', true);
    await useHabitsStore.getState().setCompletion(db, habit.id, '2026-09-12', true);
    expect(useHabitsStore.getState().completions[habit.id]).toEqual(['2026-09-12']);
  });

  it('removes the date when un-completing', async () => {
    const habit = await useHabitsStore.getState().addHabit(db, base);
    await useHabitsStore.getState().setCompletion(db, habit.id, '2026-09-12', true);
    await useHabitsStore.getState().setCompletion(db, habit.id, '2026-09-12', false);
    expect(useHabitsStore.getState().completions[habit.id]).toEqual([]);
  });

  it('rolls the optimistic update back when the write fails', async () => {
    const habit = await useHabitsStore.getState().addHabit(db, base);
    await useHabitsStore.getState().setCompletion(db, habit.id, '2026-09-10', true);

    const failing = {
      ...db,
      runAsync: jest.fn().mockRejectedValue(new Error('database is locked')),
    };

    await expect(
      useHabitsStore.getState().setCompletion(failing, habit.id, '2026-09-11', true),
    ).rejects.toThrow(/locked/);

    // The UI must not be left showing a completion that was never stored.
    expect(useHabitsStore.getState().completions[habit.id]).toEqual(['2026-09-10']);
  });
});

describe('archive, delete and reorder', () => {
  it('moves a habit in and out of the archive', async () => {
    const habit = await useHabitsStore.getState().addHabit(db, base);
    await useHabitsStore.getState().setArchived(db, habit.id, true);
    expect(selectActiveHabits(useHabitsStore.getState())).toHaveLength(0);
    expect(selectArchivedHabits(useHabitsStore.getState())).toHaveLength(1);

    await useHabitsStore.getState().setArchived(db, habit.id, false);
    expect(selectActiveHabits(useHabitsStore.getState())).toHaveLength(1);
  });

  it('drops the habit and its completions on delete', async () => {
    const habit = await useHabitsStore.getState().addHabit(db, base);
    await useHabitsStore.getState().setCompletion(db, habit.id, '2026-09-10', true);
    await useHabitsStore.getState().removeHabit(db, habit.id);

    const state = useHabitsStore.getState();
    expect(state.habits).toHaveLength(0);
    expect(state.completions[habit.id]).toBeUndefined();
  });

  it('applies a new order immediately and persists it', async () => {
    const a = await useHabitsStore.getState().addHabit(db, base);
    const b = await useHabitsStore.getState().addHabit(db, { ...base, name: 'Read' });
    await useHabitsStore.getState().reorder(db, [b.id, a.id]);

    expect(useHabitsStore.getState().habits.map((h) => h.id)).toEqual([b.id, a.id]);
    await useHabitsStore.getState().load(db);
    expect(useHabitsStore.getState().habits.map((h) => h.id)).toEqual([b.id, a.id]);
  });
});

describe('editHabit', () => {
  it('merges the patch into the in-memory habit', async () => {
    const habit = await useHabitsStore.getState().addHabit(db, base);
    await useHabitsStore.getState().editHabit(db, habit.id, { name: 'Meditate 10m' });
    expect(useHabitsStore.getState().habits[0]!.name).toBe('Meditate 10m');
  });
});
