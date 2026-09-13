import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { WEEKDAY_LABELS, type Weekday } from '@/logic/dates';
import type { Frequency } from '@/logic/frequency';
import { HABIT_COLORS, MIN_TOUCH_TARGET, readableTextOn, useTheme, withAlpha } from '@/theme';

import { Text } from './ui/Text';

/** Curated Feather glyphs that read clearly at 15pt. No emoji — ever. */
export const HABIT_ICONS: (keyof typeof Feather.glyphMap)[] = [
  'activity', 'book-open', 'coffee', 'droplet', 'edit-3', 'feather',
  'heart', 'home', 'moon', 'music', 'sun', 'target',
  'trending-up', 'umbrella', 'watch', 'wind', 'zap', 'smile',
];

/* --------------------------------------------------------------- colour */

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const { spacing, radius } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.xs }}
    >
      {HABIT_COLORS.map(({ name, value: color }) => {
        const selected = color.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={color}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(color);
            }}
            accessibilityRole="radio"
            accessibilityLabel={name}
            accessibilityState={{ selected }}
            hitSlop={6}
            style={{
              width: MIN_TOUCH_TARGET,
              height: MIN_TOUCH_TARGET,
              borderRadius: radius.full,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selected ? <Feather name="check" size={20} color={readableTextOn(color)} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ----------------------------------------------------------------- icon */

export function IconPicker({
  value,
  onChange,
  tint,
}: {
  value: string | null;
  onChange: (icon: string | null) => void;
  tint: string;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {HABIT_ICONS.map((icon) => {
        const selected = value === icon;
        return (
          <Pressable
            key={icon}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(selected ? null : icon);
            }}
            accessibilityRole="radio"
            accessibilityLabel={icon.replace(/-/g, ' ')}
            accessibilityState={{ selected }}
            style={{
              width: MIN_TOUCH_TARGET,
              height: MIN_TOUCH_TARGET,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              backgroundColor: selected ? withAlpha(tint, 0.16) : colors.surfaceAlt,
              borderWidth: selected ? 1.5 : 0,
              borderColor: tint,
            }}
          >
            <Feather name={icon} size={19} color={selected ? tint : colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------ frequency */

type FrequencyKind = Frequency['type'];

export function FrequencyPicker({
  value,
  onChange,
  tint,
}: {
  value: Frequency;
  onChange: (frequency: Frequency) => void;
  tint: string;
}) {
  const { colors, spacing, radius } = useTheme();

  const select = (kind: FrequencyKind) => {
    void Haptics.selectionAsync();
    if (kind === 'daily') onChange({ type: 'daily' });
    else if (kind === 'weekly') onChange({ type: 'weekly', timesPerWeek: 3 });
    else onChange({ type: 'custom', days: [1, 3, 5] });
  };

  const toggleDay = (day: Weekday) => {
    if (value.type !== 'custom') return;
    void Haptics.selectionAsync();
    const days = value.days.includes(day)
      ? value.days.filter((d) => d !== day)
      : [...value.days, day].sort((a, b) => a - b);
    onChange({ type: 'custom', days });
  };

  const setQuota = (times: number) => {
    void Haptics.selectionAsync();
    onChange({ type: 'weekly', timesPerWeek: times });
  };

  const options: { kind: FrequencyKind; label: string }[] = [
    { kind: 'daily', label: 'Daily' },
    { kind: 'weekly', label: 'Times a week' },
    { kind: 'custom', label: 'Specific days' },
  ];

  return (
    <View style={{ gap: spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          padding: 3,
        }}
      >
        {options.map((option) => {
          const selected = value.type === option.kind;
          return (
            <Pressable
              key={option.kind}
              onPress={() => select(option.kind)}
              accessibilityRole="tab"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              style={{
                flex: 1,
                minHeight: MIN_TOUCH_TARGET - 8,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.sm,
                backgroundColor: selected ? colors.surface : 'transparent',
              }}
            >
              <Text variant="caption" tone={selected ? 'default' : 'muted'}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {value.type === 'custom' ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {WEEKDAY_LABELS.map((label, index) => {
            const day = index as Weekday;
            const selected = value.days.includes(day);
            return (
              <Pressable
                key={label}
                onPress={() => toggleDay(day)}
                accessibilityRole="checkbox"
                accessibilityLabel={label}
                accessibilityState={{ checked: selected }}
                style={{
                  flex: 1,
                  height: MIN_TOUCH_TARGET,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.md,
                  backgroundColor: selected ? tint : colors.surfaceAlt,
                }}
              >
                <Text
                  variant="caption"
                  color={selected ? readableTextOn(tint) : colors.textMuted}
                >
                  {label.slice(0, 1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {value.type === 'weekly' ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[1, 2, 3, 4, 5, 6, 7].map((times) => {
            const selected = value.timesPerWeek === times;
            return (
              <Pressable
                key={times}
                onPress={() => setQuota(times)}
                accessibilityRole="radio"
                accessibilityLabel={`${times} times per week`}
                accessibilityState={{ selected }}
                style={{
                  flex: 1,
                  height: MIN_TOUCH_TARGET,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.md,
                  backgroundColor: selected ? tint : colors.surfaceAlt,
                }}
              >
                <Text
                  variant="caption"
                  color={selected ? readableTextOn(tint) : colors.textMuted}
                >
                  {times}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
