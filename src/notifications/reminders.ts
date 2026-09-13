import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Habit } from '@/db/types';
import {
  buildReminderTriggers,
  reminderBody,
  reminderTitle,
  type ReminderTrigger,
} from './schedule';

/**
 * Habit reminders.
 *
 * A habit may need several OS-level notifications (one per selected weekday),
 * so the ids are stored joined by `,` in `habits.notification_id`. Rescheduling
 * always cancels the previous set first — a stale trigger surviving an edit is
 * the classic "why am I still being reminded about a deleted habit" bug.
 */

export const REMINDER_CHANNEL_ID = 'habit-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Habit reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** Requests notification permission. Returns true when reminders may be scheduled. */
export async function requestNotificationPermission(): Promise<boolean> {
  await ensureAndroidChannel();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: false, allowBadge: false },
  });
  return result.granted;
}

function toNativeTrigger(trigger: ReminderTrigger): Notifications.NotificationTriggerInput {
  if (trigger.kind === 'daily') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: trigger.hour,
      minute: trigger.minute,
      channelId: REMINDER_CHANNEL_ID,
    };
  }
  return {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: trigger.weekday,
    hour: trigger.hour,
    minute: trigger.minute,
    channelId: REMINDER_CHANNEL_ID,
  };
}

export function parseNotificationIds(stored: string | null): string[] {
  if (!stored) return [];
  return stored.split(',').filter(Boolean);
}

export async function cancelHabitReminders(stored: string | null): Promise<void> {
  await Promise.all(
    parseNotificationIds(stored).map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {
        // Already fired or cancelled elsewhere — nothing to clean up.
      }),
    ),
  );
}

/**
 * Cancels any existing reminders for the habit and schedules the current set.
 * Returns the value to persist in `habits.notification_id`, or null.
 */
export async function syncHabitReminders(habit: Habit): Promise<string | null> {
  await cancelHabitReminders(habit.notificationId);

  if (!habit.reminderEnabled || habit.archived) return null;

  const triggers = buildReminderTriggers(habit.frequency, habit.reminderTime);
  if (triggers.length === 0) return null;

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const ids = await Promise.all(
    triggers.map((trigger) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: reminderTitle(habit.name),
          body: reminderBody(habit.name),
          data: { habitId: habit.id },
        },
        trigger: toNativeTrigger(trigger),
      }),
    ),
  );
  return ids.join(',');
}

/** Cancels every scheduled reminder — used when the user turns reminders off. */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
