import { Feather } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { useTheme, withAlpha } from '@/theme';

import { Button } from './ui/Button';
import { Text } from './ui/Text';

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing['4xl'], gap: spacing.base }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.xl,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: withAlpha(colors.text, 0.05),
        }}
      >
        <Feather name={icon} size={26} color={colors.textMuted} />
      </View>
      <View style={{ gap: spacing.xs, alignItems: 'center' }}>
        <Text variant="heading" align="center">
          {title}
        </Text>
        <Text variant="body" tone="muted" align="center" style={{ maxWidth: 300 }}>
          {body}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Button label={actionLabel} icon="plus" onPress={onAction} style={{ marginTop: spacing.sm }} />
      ) : null}
    </View>
  );
}
