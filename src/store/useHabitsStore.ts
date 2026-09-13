import { create } from 'zustand';

import {
  archiveHabit as archiveHabitRow,
  countActiveHabits,
  createHabit as createHabitRow,
  deleteHabit as deleteHabitRow,
  listAllCompletionDates,
  listHabits,
  reorderHabits as reorderHabitRows,
  setCompletion as setCompletionRow,
  unarchiveHabit as unarchiveHabitRow,
  updateHabit as updateHabitRow,
} from '@/db/repository';
import type { SqlDriver } from '@/db/driver';
import type { CreateHabitInput, Habit, UpdateHabitInput } from '@/db/types';
import type { DateKey } from '@/logic/dates';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface HabitsState {
  habits: Habit[];
  /** habitId → every logged local date, ascending. */
  completions: Record<string, DateKey[]>;
  status: LoadStatus;
  error: string | null;

  load: (db: SqlDriver) => Promise<void>;
  addHabit: (db: SqlDriver, input: CreateHabitInput) => Promise<Habit>;
  editHabit: (db: SqlDriver, id: string, patch: UpdateHabitInput) => Promise<void>;
  removeHabit: (db: SqlDriver, id: string) => Promise<void>;
  setArchived: (db: SqlDriver, id: string, archived: boolean) => Promise<void>;
  reorder: (db: SqlDriver, ids: string[]) => Promise<void>;
  setCompletion: (
    db: SqlDriver,
    habitId: string,
    date: DateKey,
    completed: boolean,
  ) => Promise<void>;
  activeHabitCount: (db: SqlDriver) => Promise<number>;
}

function withDate(dates: DateKey[] | undefined, date: DateKey): DateKey[] {
  const next = dates ? [...dates] : [];
  if (next.includes(date)) return next;
  next.push(date);
  next.sort();
  return next;
}

export const useHabitsStore = create<HabitsState>((set, get) => ({
  habits: [],
  completions: {},
  status: 'idle',
  error: null,

  async load(db) {
    set({ status: get().status === 'ready' ? 'ready' : 'loading', error: null });
    try {
      // Two queries for the entire app state — no per-habit fan-out.
      const [habits, completionMap] = await Promise.all([
        listHabits(db, { includeArchived: true }),
        listAllCompletionDates(db),
      ]);
      set({
        habits,
        completions: Object.fromEntries(completionMap),
        status: 'ready',
        error: null,
      });
    } catch (error) {
      set({ status: 'error', error: (error as Error).message });
    }
  },

  async addHabit(db, input) {
    const habit = await createHabitRow(db, input);
    set((state) => ({ habits: [...state.habits, habit] }));
    return habit;
  },

  async editHabit(db, id, patch) {
    await updateHabitRow(db, id, patch);
    set((state) => ({
      habits: state.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    }));
  },

  async removeHabit(db, id) {
    await deleteHabitRow(db, id);
    set((state) => {
      const completions = { ...state.completions };
      delete completions[id];
      return { habits: state.habits.filter((h) => h.id !== id), completions };
    });
  },

  async setArchived(db, id, archived) {
    if (archived) await archiveHabitRow(db, id);
    else await unarchiveHabitRow(db, id);
    set((state) => ({
      habits: state.habits.map((h) => (h.id === id ? { ...h, archived } : h)),
    }));
  },

  async reorder(db, ids) {
    // Reorder optimistically so the drag does not snap back while SQLite writes.
    const order = new Map(ids.map((id, index) => [id, index]));
    set((state) => ({
      habits: [...state.habits].sort(
        (a, b) =>
          (order.get(a.id) ?? a.sortOrder) - (order.get(b.id) ?? b.sortOrder),
      ),
    }));
    await reorderHabitRows(db, ids);
  },

  async setCompletion(db, habitId, date, completed) {
    const previous = get().completions[habitId] ?? [];
    // Optimistic: the check-in tap must feel instant.
    set((state) => ({
      completions: {
        ...state.completions,
        [habitId]: completed
          ? withDate(state.completions[habitId], date)
          : (state.completions[habitId] ?? []).filter((d) => d !== date),
      },
    }));
    try {
      await setCompletionRow(db, habitId, date, completed);
    } catch (error) {
      set((state) => ({
        completions: { ...state.completions, [habitId]: previous },
        error: (error as Error).message,
      }));
      throw error;
    }
  },

  activeHabitCount(db) {
    return countActiveHabits(db);
  },
}));

/** Selector: only the habits visible on the home screen. */
export function selectActiveHabits(state: HabitsState): Habit[] {
  return state.habits.filter((h) => !h.archived);
}

export function selectArchivedHabits(state: HabitsState): Habit[] {
  return state.habits.filter((h) => h.archived);
}
