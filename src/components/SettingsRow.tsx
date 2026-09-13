import { Feather } from '@expo/vector-icons';
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH_TARGET, useTheme, withAlpha } from '@/theme';

import { Text } from './ui/Text';

interface SettingsRowProps {
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  accessory?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

export function SettingsRow({
  icon,
  label,
  description,
  value,
  onPress,
  accessory,
  destructive = false,
  disabled = false,
}: SettingsRowProps) {
  const { colors, spacing } = useTheme();
  const tint = destructive ? colors.danger : colors.text;
  const interactive = Boolean(onPress) && !disabled;

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: MIN_TOUCH_TARGET + 8,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.base,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon ? <Feather name={icon} size={18} color={destructive ? colors.danger : colors.textMuted} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" color={tint}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="callout" tone="muted">
          {value}
        </Text>
      ) : null}
      {accessory}
      {interactive && !accessory ? (
        <Feather name="chevron-right" size={18} color={colors.textFaint} />
      ) : null}
    </View>
  );

  if (!interactive) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
      android_ripple={{ color: withAlpha(colors.text, 0.08) }}
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.surfaceAlt : 'transparent' })}
    >
      {content}
    </Pressable>
  );
}

export function SettingsGroup({ children, title }: { children: ReactNode; title?: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      {title ? (
        <Text variant="micro" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          {title.toUpperCase()}
        </Text>
      ) : null}
      <View
        style={{
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

export function Divider() {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        marginLeft: spacing.base,
      }}
    />
  );
}
