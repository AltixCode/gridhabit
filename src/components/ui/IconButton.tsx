import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';

import { MIN_TOUCH_TARGET, useTheme, withAlpha } from '@/theme';

export interface IconButtonProps extends Omit<PressableProps, 'style'> {
  icon: keyof typeof Feather.glyphMap;
  /** Required: an icon-only control is invisible to a screen reader without it. */
  accessibilityLabel: string;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  accessibilityLabel,
  size = 20,
  color,
  onPress,
  style,
  ...rest
}: IconButtonProps) {
  const { colors, radius } = useTheme();
  const tint = color ?? colors.text;

  const handlePress = useCallback<NonNullable<PressableProps['onPress']>>(
    (event) => {
      void Haptics.selectionAsync();
      onPress?.(event);
    },
    [onPress],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      hitSlop={8}
      android_ripple={{ color: withAlpha(tint, 0.12), borderless: true, radius: 24 }}
      style={({ pressed }) => [
        {
          width: MIN_TOUCH_TARGET,
          height: MIN_TOUCH_TARGET,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.full,
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
      {...rest}
    >
      <Feather name={icon} size={size} color={tint} />
    </Pressable>
  );
}
