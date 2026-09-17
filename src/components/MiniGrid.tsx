import React, { memo, useMemo } from 'react';
import { View } from 'react-native';

import type { DateKey } from '@/logic/dates';
import type { Frequency } from '@/logic/frequency';
import { buildContributionGrid, type GridCell } from '@/logic/grid';
import { mix, useTheme, withAlpha } from '@/theme';

interface MiniGridProps {
  completions: readonly DateKey[];
  frequency: Frequency;
  createdAt: DateKey;
  today: DateKey;
  color: string;
  weeks?: number;
  cellSize?: number;
  gap?: number;
}

/**
 * The compact grid shown on each home-screen row. Non-interactive and exposed
 * to assistive tech as a single summarised image rather than 100+ cells.
 */
function MiniGridComponent({
  completions,
  frequency,
  createdAt,
  today,
  color,
  weeks = 14,
  cellSize = 9,
  gap = 2.5,
}: MiniGridProps) {
  const { colors } = useTheme();
  const grid = useMemo(
    () => buildContributionGrid(completions, { today, createdAt, frequency, weeks }),
    [completions, today, createdAt, frequency, weeks],
  );

  const fillFor = (cell: GridCell): string => {
    // A day before the habit existed, or still to come, is drawn as an empty
    // cell rather than as nothing.
    //
    // It used to return 'transparent', which meant a habit created today
    // rendered 97 of its 98 cells invisible: a large empty band with one faint
    // square in it, on the home screen of a fresh install -- which is the only
    // state an App Store reviewer ever sees. The row reserved the full grid
    // height either way, so the space was spent and showed nothing.
    //
    // Drawing the scaffold is what GitHub's contribution graph does, and this
    // component already computes every one of those cells. A future day is
    // dimmer than a past one so the grid still reads as "up to today".
    if (cell.isFuture) return withAlpha(colors.gridEmpty, 0.45);
    if (cell.isBeforeStart) return colors.gridEmpty;
    if (cell.completed) return mix(color, colors.surface, cell.intensity);
    if (cell.isMissed) return colors.gridMissed;
    return colors.gridEmpty;
  };

  const completedCount = grid.reduce(
    (total, column) => total + column.filter((c) => c.completed).length,
    0,
  );

  return (
    <View
      style={{ flexDirection: 'row' }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Activity over the last ${weeks} weeks: ${completedCount} days completed`}
    >
      {grid.map((column) => (
        <View key={column[0]?.date} style={{ marginRight: gap }}>
          {column.map((cell) => (
            <View
              key={cell.date}
              style={{
                width: cellSize,
                height: cellSize,
                marginBottom: gap,
                borderRadius: Math.max(1.5, cellSize * 0.28),
                backgroundColor: fillFor(cell),
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export const MiniGrid = memo(MiniGridComponent);
