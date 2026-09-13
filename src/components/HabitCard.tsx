import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Habit } from '@/db/types';
import type { DateKey } from '@/logic/dates';
import { describeFrequency, isHabitDueOn, isNeverDue } from '@/logic/frequency';
import { calculateStreak } from '@/logic/streak';
import { useTheme } from '@/theme';

import { CheckButton } from './CheckButton';
import { MiniGrid } from './MiniGrid';
import { StreakBadge } from './StreakBadge';
import { Text } from './ui/Text';

interface HabitCardProps {
  habit: Habit;
  completions: readonly DateKey[];
  today: DateKey;
  onToggleToday: (habitId: string) => void;
}

function HabitCardComponent({ habit, completions, today, onToggleToday }: HabitCardProps) {
  const { colors, radius, spacing, elevation } = useTheme();

  const streak = useMemo(
    () => calculateStreak(completions, habit.frequency, today),
    [completions, habit.frequency, today],
  );
  const isCompletedToday = useMemo(() => completions.includes(today), [completions, today]);
  const isDueToday = !isNeverDue(habit.frequency) && isHabitDueOn(habit.frequency, today);

  return (
    <Link href={{ pathname: '/habit/[id]', params: { id: habit.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${habit.name}. ${describeFrequency(habit.frequency)}.`}
        accessibilityHint="Opens habit details"
        style={({ pressed }) => [
          {
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            padding: spacing.base,
            gap: spacing.md,
            opacity: pressed ? 0.94 : 1,
          },
          elevation.card,
        ]}
      >
        <View style={[styles.header, { gap: spacing.md }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={[styles.titleRow, { gap: spacing.sm }]}>
              {habit.icon ? (
                <Feather
                  name={habit.icon as keyof typeof Feather.glyphMap}
                  size={15}
                  color={habit.color}
                />
              ) : (
                <View
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 3,
                    backgroundColor: habit.color,
                  }}
                />
              )}
              <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                {habit.name}
              </Text>
            </View>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {describeFrequency(habit.frequency)}
              {!isDueToday ? ' · not due today' : ''}
            </Text>
          </View>

          <StreakBadge streak={streak} frequency={habit.frequency} compact />

          <CheckButton
            completed={isCompletedToday}
            color={habit.color}
            dimmed={!isDueToday}
            onToggle={() => onToggleToday(habit.id)}
            label={`Mark ${habit.name} ${isCompletedToday ? 'incomplete' : 'complete'} for today`}
          />
        </View>

        <MiniGrid
          completions={completions}
          frequency={habit.frequency}
          createdAt={habit.createdAt}
          today={today}
          color={habit.color}
        />
      </Pressable>
    </Link>
  );
}

export const HabitCard = memo(HabitCardComponent);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
});
