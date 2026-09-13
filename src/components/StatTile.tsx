import Feather from '@expo/vector-icons/Feather';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './ui/Text';

interface StatTileProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  tint?: string;
}

export function StatTile({ icon, label, value, tint }: StatTileProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flex: 1,
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
      }}
    >
      <Feather name={icon} size={15} color={tint ?? colors.textMuted} />
      {/* Tabular numerals keep the tile from reflowing as the value changes. */}
      <Text variant="heading" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text variant="micro" tone="muted">
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
