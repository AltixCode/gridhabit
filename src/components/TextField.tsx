import React, { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { Text } from './ui/Text';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
}

/**
 * A labelled input. The label is always visible — a placeholder-only field
 * loses its own label the moment the user starts typing.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, style, ...rest },
  ref,
) {
  const { colors, radius, spacing, typography } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.textFaint}
        style={[
          typography.body,
          {
            minHeight: MIN_TOUCH_TARGET + 6,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: error ? colors.danger : colors.border,
            color: colors.text,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="faint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
