import type { DateKey } from '@/logic/dates';
import type { Frequency } from '@/logic/frequency';

/** A habit as the app sees it — the row shape is an implementation detail. */
export interface Habit {
  id: string;
  name: string;
  /** Hex colour driving the habit's grid and accents. */
  color: string;
  icon: string | null;
  frequency: Frequency;
  createdAt: DateKey;
  archived: boolean;
  sortOrder: number;
  reminderEnabled: boolean;
  /** Local `HH:mm`, or null when no reminder is set. */
  reminderTime: string | null;
  /** The scheduled `expo-notifications` identifier, so it can be cancelled. */
  notificationId: string | null;
}

export interface CreateHabitInput {
  name: string;
  color: string;
  icon?: string | null;
  frequency: Frequency;
  createdAt: DateKey;
  reminderEnabled?: boolean;
  reminderTime?: string | null;
}

export type UpdateHabitInput = Partial<
  Pick<
    Habit,
    | 'name'
    | 'color'
    | 'icon'
    | 'frequency'
    | 'archived'
    | 'reminderEnabled'
    | 'reminderTime'
    | 'notificationId'
  >
>;

export interface HabitRow {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  frequency: string;
  created_at: string;
  archived: number;
  sort_order: number;
  reminder_enabled: number;
  reminder_time: string | null;
  notification_id: string | null;
}
