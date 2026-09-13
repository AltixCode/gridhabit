import Feather from '@expo/vector-icons/Feather';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Alert, View } from 'react-native';

import { BannerAdSlot } from '@/components/BannerAdSlot';
import { ContributionGrid } from '@/components/ContributionGrid';
import { StatTile } from '@/components/StatTile';
import { streakLabel } from '@/components/StreakBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useDb } from '@/hooks/useHabitData';
import { useToday } from '@/hooks/useToday';
import { describeFrequency } from '@/logic/frequency';
import { summarizeHabit } from '@/logic/streak';
import { cancelHabitReminders } from '@/notifications/reminders';
import { useHabitsStore } from '@/store/useHabitsStore';
import { useTheme } from '@/theme';

const GRID_WEEKS = 52;

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useDb();
  const today = useToday();
  const { colors, spacing } = useTheme();

  const habit = useHabitsStore((s) => s.habits.find((h) => h.id === id));
  const completions = useHabitsStore((s) => (id ? (s.completions[id] ?? []) : []));
  const setCompletion = useHabitsStore((s) => s.setCompletion);
  const setArchived = useHabitsStore((s) => s.setArchived);
  const removeHabit = useHabitsStore((s) => s.removeHabit);

  const summary = useMemo(
    () =>
      habit
        ? summarizeHabit(completions, habit.frequency, habit.createdAt, today)
        : null,
    [habit, completions, today],
  );

  const handleToggleDay = useCallback(
    (date: string) => {
      if (!habit) return;
      void setCompletion(db, habit.id, date, !completions.includes(date));
    },
    [db, habit, completions, setCompletion],
  );

  const handleArchive = useCallback(() => {
    if (!habit) return;
    void cancelHabitReminders(habit.notificationId);
    void setArchived(db, habit.id, !habit.archived);
    router.back();
  }, [db, habit, router, setArchived]);

  const handleDelete = useCallback(() => {
    if (!habit) return;
    Alert.alert(
      `Delete “${habit.name}”?`,
      'This permanently removes the habit and its entire history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void cancelHabitReminders(habit.notificationId);
            void removeHabit(db, habit.id);
            router.back();
          },
        },
      ],
    );
  }, [db, habit, removeHabit, router]);

  if (!habit || !summary) {
    return (
      <Screen>
        <Text variant="body" tone="muted">
          This habit is no longer available.
        </Text>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: habit.name,
          headerRight: () => (
            <IconButton
              icon="edit-2"
              accessibilityLabel="Edit habit"
              onPress={() => router.push({ pathname: '/habit/edit/[id]', params: { id: habit.id } })}
            />
          ),
        }}
      />
      <Screen scroll contentContainerStyle={{ gap: spacing.base }}>
        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {habit.icon ? (
              <Feather
                name={habit.icon as keyof typeof Feather.glyphMap}
                size={18}
                color={habit.color}
              />
            ) : null}
            <Text variant="caption" tone="muted">
              {describeFrequency(habit.frequency)}
            </Text>
          </View>
          <Text variant="numeric" color={habit.color} style={{ fontVariant: ['tabular-nums'] }}>
            {streakLabel(summary.currentStreak, habit.frequency)}
          </Text>
          <Text variant="caption" tone="muted">
            {summary.currentStreak > 0 ? 'Current streak' : 'Complete today to start a streak'}
          </Text>
        </View>

        <Card>
          <ContributionGrid
            completions={completions}
            frequency={habit.frequency}
            createdAt={habit.createdAt}
            today={today}
            color={habit.color}
            weeks={GRID_WEEKS}
            onToggleDay={handleToggleDay}
          />
          <Text variant="micro" tone="faint" style={{ marginTop: spacing.md }}>
            Tap any past day to correct it.
          </Text>
        </Card>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatTile
            icon="award"
            label="Longest"
            value={String(summary.longestStreak)}
            tint={habit.color}
          />
          <StatTile
            icon="check-circle"
            label="Total"
            value={String(summary.totalCompletions)}
            tint={habit.color}
          />
          <StatTile
            icon="percent"
            label="Rate"
            value={`${Math.round(summary.completionRate * 100)}%`}
            tint={habit.color}
          />
        </View>

        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button
            label={habit.archived ? 'Unarchive habit' : 'Archive habit'}
            variant="secondary"
            icon="archive"
            fullWidth
            onPress={handleArchive}
          />
          <Button
            label="Delete habit"
            variant="ghost"
            icon="trash-2"
            fullWidth
            onPress={handleDelete}
            style={{ borderColor: colors.border }}
          />
        </View>
      </Screen>
      <BannerAdSlot />
    </View>
  );
}
