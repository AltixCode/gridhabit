import * as Haptics from 'expo-haptics';
import React, { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { WEEKDAY_LABELS, formatDateKeyLong, type DateKey } from '@/logic/dates';
import type { Frequency } from '@/logic/frequency';
import { buildContributionGrid, gridMonthLabels, type GridCell } from '@/logic/grid';
import { mix, useTheme } from '@/theme';

import { Text } from './ui/Text';

export interface ContributionGridProps {
  completions: readonly DateKey[];
  frequency: Frequency;
  createdAt: DateKey;
  today: DateKey;
  color: string;
  weeks?: number;
  cellSize?: number;
  gap?: number;
  /** Omit to render a read-only grid. */
  onToggleDay?: (date: DateKey) => void;
  showLabels?: boolean;
  /** Scrolls to the most recent week on mount. */
  scrollable?: boolean;
}

/**
 * The GitHub-style contribution grid — the product's whole visual hook.
 *
 * Layout notes:
 *  - Columns are weeks, rows are weekdays, newest week last, matching the
 *    mental model every developer already has for this shape.
 *  - Completed cells are pre-blended against the surface colour rather than
 *    drawn with opacity, so the 3px gutters stay perfectly even.
 *  - Missed due days get a faint solid fill and non-due days stay empty, which
 *    is what makes a Mon/Wed/Fri habit legible at a glance.
 */
function ContributionGridComponent({
  completions,
  frequency,
  createdAt,
  today,
  color,
  weeks = 52,
  cellSize = 12,
  gap = 3,
  onToggleDay,
  showLabels = true,
  scrollable = true,
}: ContributionGridProps) {
  const { colors, radius, spacing } = useTheme();

  const grid = useMemo(
    () => buildContributionGrid(completions, { today, createdAt, frequency, weeks }),
    [completions, today, createdAt, frequency, weeks],
  );
  const monthLabels = useMemo(() => (showLabels ? gridMonthLabels(grid) : []), [grid, showLabels]);

  const columnWidth = cellSize + gap;
  const cellRadius = Math.max(2, Math.round(cellSize * 0.28));

  const fillFor = (cell: GridCell): string => {
    if (cell.isBeforeStart || cell.isFuture) return 'transparent';
    if (cell.completed) return mix(color, colors.surface, cell.intensity);
    if (cell.isMissed) return colors.gridMissed;
    return colors.gridEmpty;
  };

  const body = (
    <View style={styles.row}>
      {showLabels ? (
        <View style={{ marginRight: gap * 2, paddingTop: monthLabels.length ? 18 : 0 }}>
          {WEEKDAY_LABELS.map((label, index) => (
            <View key={label} style={{ height: cellSize, marginBottom: gap, justifyContent: 'center' }}>
              {/* GitHub labels alternate rows to avoid a cramped axis. */}
              {index % 2 === 1 ? (
                <Text variant="micro" tone="faint">
                  {label.slice(0, 1)}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View>
        {monthLabels.length ? (
          <View style={[styles.row, { height: 18 }]}>
            {monthLabels.map((label, index) => (
              <View key={`${label}-${index}`} style={{ width: columnWidth }}>
                {label ? (
                  <Text variant="micro" tone="faint" numberOfLines={1}>
                    {label}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.row}>
          {grid.map((column) => (
            <View key={column[0]?.date} style={{ marginRight: gap }}>
              {column.map((cell) => {
                const interactive = Boolean(onToggleDay) && !cell.isFuture && !cell.isBeforeStart;
                const fill = fillFor(cell);
                return (
                  <Pressable
                    key={cell.date}
                    disabled={!interactive}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onToggleDay?.(cell.date);
                    }}
                    // The 12pt square is below the 44pt minimum by design — it is
                    // a dense data view. hitSlop restores a usable touch area.
                    hitSlop={Math.max(0, Math.round((44 - cellSize) / 2))}
                    accessibilityRole={interactive ? 'button' : 'image'}
                    accessibilityLabel={`${formatDateKeyLong(cell.date)}: ${
                      cell.completed ? 'completed' : cell.isMissed ? 'missed' : 'not due'
                    }`}
                    accessibilityState={{ selected: cell.completed }}
                    style={({ pressed }) => ({
                      width: cellSize,
                      height: cellSize,
                      marginBottom: gap,
                      borderRadius: cellRadius,
                      backgroundColor: fill,
                      opacity: pressed ? 0.55 : 1,
                      borderWidth: cell.isToday ? 1.5 : 0,
                      borderColor: cell.isToday ? colors.text : 'transparent',
                    })}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  if (!scrollable) return body;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: spacing.base }}
      // Start at the most recent week; history is to the left, as on GitHub.
      ref={(ref) => ref?.scrollToEnd({ animated: false })}
      style={{ borderRadius: radius.sm }}
    >
      {body}
    </ScrollView>
  );
}

export const ContributionGrid = memo(ContributionGridComponent);

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});
