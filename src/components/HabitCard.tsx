import Feather from '@expo/vector-icons/Feather';
import { Link } from 'expo-router';
import React, { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Habit } from '@/db/types';
import { t } from '@/i18n';
import { frequencyLabel } from '@/i18n/frequency';
import type { DateKey } from '@/logic/dates';
import { isHabitDueOn, isNeverDue } from '@/logic/frequency';
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


/**
 * How many weeks of history fit the width we were given.
 *
 * A column is one cell plus its gap. Clamped so a narrow phone still shows a
 * meaningful stretch and a very wide tablet does not render a year of history
 * nobody asked for. Returns the previous fixed value until the row has been
 * measured, so the first frame is never empty.
 */
const CELL = 9;
const GAP = 2.5;
const DEFAULT_WEEKS = 14;

export function weeksForWidth(width: number): number {
  if (!width) return DEFAULT_WEEKS;
  const fits = Math.floor(width / (CELL + GAP));
  return Math.max(8, Math.min(30, fits));
}

function HabitCardComponent({ habit, completions, today, onToggleToday }: HabitCardProps) {
  const [gridWidth, setGridWidth] = useState(0);
  const { colors, radius, spacing, elevation } = useTheme();

  const streak = useMemo(
    () => calculateStreak(completions, habit.frequency, today),
    [completions, habit.frequency, today],
  );
  const isCompletedToday = useMemo(() => completions.includes(today), [completions, today]);
  const isDueToday = !isNeverDue(habit.frequency) && isHabitDueOn(habit.frequency, today);

  // The card is NOT an accessibility element.
  //
  // A View or Pressable carrying an accessibilityRole becomes one element and
  // COLLAPSES everything inside it. With the role on the outer card, VoiceOver
  // saw the whole row as a single "Morning. Every day." button -- so the check
  // button was unreachable and the activity grid announced nothing. Marking a
  // habit done is this app's primary daily action and the only thing most
  // people do, and it was entirely absent with VoiceOver on.
  //
  // The card stays tappable by touch; the "open details" affordance moves onto
  // the title block, which is the part that means "this habit". The check
  // button and the grid are then siblings a screen reader can reach.
  return (
    <Link href={{ pathname: '/habit/[id]', params: { id: habit.id } }} asChild>
      <Pressable
        accessible={false}
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
          <View
            style={{ flex: 1, gap: 2 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('habitCardA11y', { name: habit.name, frequency: frequencyLabel(habit.frequency) })}
            accessibilityHint={t('opensHabitDetails')}
          >
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
              {frequencyLabel(habit.frequency)}
              {!isDueToday ? ` · ${t('notDueTodaySuffix')}` : ''}
            </Text>
          </View>

          <StreakBadge streak={streak} frequency={habit.frequency} compact />

          <CheckButton
            completed={isCompletedToday}
            color={habit.color}
            dimmed={!isDueToday}
            onToggle={() => onToggleToday(habit.id)}
            label={
              isCompletedToday
                ? t('markIncompleteLabel', { name: habit.name })
                : t('markCompleteLabel', { name: habit.name })
            }
          />
        </View>

        {/* The grid takes the weeks the row can actually show.
            14 was hardcoded, so on a wide tablet it occupied a fixed 161pt of
            an 880pt row and left the rest empty -- the same shape of problem on
            an Android tablet, which is why this is derived from measured width
            rather than from a device breakpoint. */}
        <View style={{ flex: 1 }} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
          <MiniGrid
            completions={completions}
            frequency={habit.frequency}
            createdAt={habit.createdAt}
            today={today}
            color={habit.color}
            weeks={weeksForWidth(gridWidth)}
          />
        </View>
      </Pressable>
    </Link>
  );
}

export const HabitCard = memo(HabitCardComponent);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
});
