import { Feather } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import type { Frequency } from '@/logic/frequency';
import { useTheme, withAlpha } from '@/theme';

import { Text } from './ui/Text';

interface StreakBadgeProps {
  streak: number;
  frequency: Frequency;
  compact?: boolean;
}

/** Pluralises the streak unit — weeks for a quota habit, days for the rest. */
export function streakLabel(streak: number, frequency: Frequency): string {
  const unit = frequency.type === 'weekly' ? 'week' : 'day';
  return `${streak} ${unit}${streak === 1 ? '' : 's'}`;
}

export function StreakBadge({ streak, frequency, compact = false }: StreakBadgeProps) {
  const { colors, radius, spacing } = useTheme();
  const active = streak > 0;

  return (
    <View
      accessible
      accessibilityLabel={active ? `Streak: ${streakLabel(streak, frequency)}` : 'No active streak'}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: compact ? spacing.sm : spacing.md,
        paddingVertical: compact ? 3 : spacing.xs,
        borderRadius: radius.full,
        backgroundColor: active ? withAlpha(colors.accent, 0.14) : colors.surfaceAlt,
      }}
    >
      <Feather
        name="zap"
        size={compact ? 11 : 13}
        color={active ? colors.accent : colors.textFaint}
      />
      <Text variant={compact ? 'micro' : 'caption'} tone={active ? 'accent' : 'faint'}>
        {active ? streakLabel(streak, frequency) : '—'}
      </Text>
    </View>
  );
}
