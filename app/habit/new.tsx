import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { HabitForm, type HabitFormValues } from '@/components/HabitForm';
import { Screen } from '@/components/ui/Screen';
import { useDb } from '@/hooks/useHabitData';
import { useToday } from '@/hooks/useToday';
import { canAddHabit } from '@/monetization/entitlements';
import { syncHabitReminders } from '@/notifications/reminders';
import { selectActiveHabitCount, useHabitsStore } from '@/store/useHabitsStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { useTheme } from '@/theme';

export default function NewHabitScreen() {
  const router = useRouter();
  const db = useDb();
  const today = useToday();
  const { spacing } = useTheme();
  const [busy, setBusy] = useState(false);

  const addHabit = useHabitsStore((s) => s.addHabit);
  const editHabit = useHabitsStore((s) => s.editHabit);
  const activeCount = useHabitsStore(selectActiveHabitCount);
  const isPremium = usePremiumStore((s) => s.isPremium);

  const handleSubmit = useCallback(
    async (values: HabitFormValues) => {
      // Re-check the gate at submit time: the user could have reached this
      // screen with a slot free and filled it on another device since.
      if (!canAddHabit(activeCount, isPremium)) {
        router.replace({ pathname: '/paywall', params: { reason: 'habit-limit' } });
        return;
      }
      setBusy(true);
      try {
        const habit = await addHabit(db, { ...values, createdAt: today });
        if (values.reminderEnabled) {
          const notificationId = await syncHabitReminders({ ...habit, ...values });
          if (notificationId) await editHabit(db, habit.id, { notificationId });
        }
        router.back();
      } catch (error) {
        Alert.alert('Could not save habit', (error as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [activeCount, addHabit, db, editHabit, isPremium, router, today],
  );

  return (
    <Screen scroll contentContainerStyle={{ paddingTop: spacing.base }}>
      <HabitForm submitLabel="Create habit" onSubmit={handleSubmit} busy={busy} />
    </Screen>
  );
}
