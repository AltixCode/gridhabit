import React, { memo, useMemo } from 'react';
import { View } from 'react-native';

import type { DateKey } from '@/logic/dates';
import type { Frequency } from '@/logic/frequency';
import { buildContributionGrid, type GridCell } from '@/logic/grid';
import { mix, useTheme } from '@/theme';

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
    if (cell.isBeforeStart || cell.isFuture) return 'transparent';
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
