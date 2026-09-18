import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useDb } from '@/hooks/useHabitData';
import { t } from '@/i18n';
import { frequencyLabel } from '@/i18n/frequency';
import { selectActiveHabits, useHabitsStore } from '@/store/useHabitsStore';
import { useTheme } from '@/theme';
import { canMove, moveItem, type MoveDirection } from '@/utils/reorder';

/**
 * Reordering the habit list.
 *
 * Deliberately built on explicit move controls rather than drag-and-drop.
 * WCAG 2.2 SC 2.5.7 (Dragging Movements) requires a single-pointer alternative
 * to any drag interaction, so these controls would be needed either way — and
 * as the primary interaction they are operable by switch control, by a screen
 * reader, and by anyone who finds a long-press-then-drag fiddly. Ordering is a
 * rare action on a list of a handful of items; it does not need a gesture.
 *
 * Each row also exposes native `accessibilityActions`, so VoiceOver and
 * TalkBack users can reorder from the rotor without hunting for the buttons.
 */
export default function ReorderScreen() {
  const db = useDb();
  const { colors, radius, spacing } = useTheme();

  // The store re-sorts optimistically on `reorder`, so it is the single source
  // of order here. Keeping a local copy in sync with an effect would be
  // redundant state — and the classic way to get the two out of step.
  const ordered = useHabitsStore(useShallow(selectActiveHabits));
  const reorder = useHabitsStore((s) => s.reorder);

  const move = useCallback(
    (index: number, direction: MoveDirection) => {
      if (!canMove(index, direction, ordered.length)) return;
      void Haptics.selectionAsync();
      const ids = ordered.map((habit) => habit.id);
      void reorder(db, moveItem(ids, index, direction === 'up' ? index - 1 : index + 1));
    },
    [db, ordered, reorder],
  );

  if (ordered.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="list"
          title={t('reorderEmptyTitle')}
          body={t('reorderEmptyBody')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={{ paddingTop: spacing.base, gap: spacing.sm }}>
      <Text variant="callout" tone="muted" style={{ marginBottom: spacing.xs }}>
        {t('reorderHint')}
      </Text>

      {ordered.map((habit, index) => (
        <View
          key={habit.id}
          accessible
          accessibilityLabel={t('reorderPositionA11y', {
            name: habit.name,
            position: index + 1,
            total: ordered.length,
          })}
          accessibilityActions={[
            ...(canMove(index, 'up', ordered.length)
              ? [{ name: 'moveUp' as const, label: t('moveUpAction') }]
              : []),
            ...(canMove(index, 'down', ordered.length)
              ? [{ name: 'moveDown' as const, label: t('moveDownAction') }]
              : []),
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'moveUp') move(index, 'up');
            if (event.nativeEvent.actionName === 'moveDown') move(index, 'down');
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingLeft: spacing.base,
            paddingRight: spacing.xs,
            paddingVertical: spacing.sm,
            borderRadius: radius.lg,
            backgroundColor: colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              backgroundColor: habit.color,
            }}
          />
          <View style={{ flex: 1, gap: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {habit.name}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {frequencyLabel(habit.frequency)}
            </Text>
          </View>

          <IconButton
            icon="chevron-up"
            accessibilityLabel={t('moveHabitUpA11y', { name: habit.name })}
            disabled={!canMove(index, 'up', ordered.length)}
            onPress={() => move(index, 'up')}
            color={canMove(index, 'up', ordered.length) ? colors.text : colors.textFaint}
          />
          <IconButton
            icon="chevron-down"
            accessibilityLabel={t('moveHabitDownA11y', { name: habit.name })}
            disabled={!canMove(index, 'down', ordered.length)}
            onPress={() => move(index, 'down')}
            color={canMove(index, 'down', ordered.length) ? colors.text : colors.textFaint}
          />
        </View>
      ))}
    </Screen>
  );
}
