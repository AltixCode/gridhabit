import React, { useCallback } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { MiniGrid } from '@/components/MiniGrid';
import { Divider, SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { Screen } from '@/components/ui/Screen';
import { useDb } from '@/hooks/useHabitData';
import { useToday } from '@/hooks/useToday';
import { selectArchivedHabits, useHabitsStore } from '@/store/useHabitsStore';
import { useTheme } from '@/theme';

export default function ArchiveScreen() {
  const db = useDb();
  const today = useToday();
  const { spacing } = useTheme();

  const archived = useHabitsStore(selectArchivedHabits);
  const completions = useHabitsStore((s) => s.completions);
  const setArchived = useHabitsStore((s) => s.setArchived);

  const restore = useCallback(
    (id: string) => {
      void setArchived(db, id, false);
    },
    [db, setArchived],
  );

  if (archived.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="archive"
          title="Nothing archived"
          body="Archiving a habit hides it from Today while keeping every square you have already filled."
        />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={{ paddingTop: spacing.base, gap: spacing.base }}>
      <SettingsGroup>
        {archived.map((habit, index) => (
          <View key={habit.id}>
            {index > 0 ? <Divider /> : null}
            <SettingsRow
              label={habit.name}
              description="Tap to restore to Today"
              onPress={() => restore(habit.id)}
              accessory={
                <MiniGrid
                  completions={completions[habit.id] ?? []}
                  frequency={habit.frequency}
                  createdAt={habit.createdAt}
                  today={today}
                  color={habit.color}
                  weeks={8}
                  cellSize={6}
                  gap={2}
                />
              }
            />
          </View>
        ))}
      </SettingsGroup>
    </Screen>
  );
}
