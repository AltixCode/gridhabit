import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { HabitForm, type HabitFormValues } from '@/components/HabitForm';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useDb } from '@/hooks/useHabitData';
import { t } from '@/i18n';
import { syncHabitReminders } from '@/notifications/reminders';
import { useHabitsStore } from '@/store/useHabitsStore';
import { useTheme } from '@/theme';

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useDb();
  const { spacing } = useTheme();
  const [busy, setBusy] = useState(false);

  const habit = useHabitsStore((s) => s.habits.find((h) => h.id === id));
  const editHabit = useHabitsStore((s) => s.editHabit);

  const handleSubmit = useCallback(
    async (values: HabitFormValues) => {
      if (!habit) return;
      setBusy(true);
      try {
        await editHabit(db, habit.id, values);
        // Reminders are rescheduled from the NEW values: an edited weekday set
        // or time must not leave the old triggers armed.
        const notificationId = await syncHabitReminders({ ...habit, ...values });
        await editHabit(db, habit.id, { notificationId });
        router.back();
      } catch (error) {
        Alert.alert(t('couldNotSaveChangesTitle'), (error as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [db, editHabit, habit, router],
  );

  if (!habit) {
    return (
      <Screen>
        <Text variant="body" tone="muted">
          {t('habitNoLongerAvailable')}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={{ paddingTop: spacing.base }}>
      <HabitForm initial={habit} submitLabel={t('saveChangesCta')} onSubmit={handleSubmit} busy={busy} />
    </Screen>
  );
}
