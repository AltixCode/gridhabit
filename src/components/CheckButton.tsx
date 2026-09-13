import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { MIN_TOUCH_TARGET, motion, readableTextOn, useTheme } from '@/theme';

interface CheckButtonProps {
  completed: boolean;
  color: string;
  onToggle: () => void;
  /** A habit that is not due today is dimmed but still tappable. */
  dimmed?: boolean;
  size?: number;
  label: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The daily check-in control — the single most-tapped element in the app.
 *
 * The tick pops on completion (a short over-shoot spring) and simply fades on
 * un-completion: celebrating an undo would be noise. Both paths respect the
 * OS reduce-motion setting via the font-scale-independent spring config.
 */
export function CheckButton({
  completed,
  color,
  onToggle,
  dimmed = false,
  size = MIN_TOUCH_TARGET,
  label,
}: CheckButtonProps) {
  const { colors, radius } = useTheme();
  const { fontScale } = useWindowDimensions();
  const scale = useSharedValue(1);
  const fill = useSharedValue(completed ? 1 : 0);

  useEffect(() => {
    // Reanimated 4's .set()/.get() accessors, rather than `.value =`, so the
    // React Compiler does not see a mutation of a value it considers immutable.
    fill.set(withTiming(completed ? 1 : 0, { duration: motion.fast }));
  }, [completed, fill]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const handlePress = () => {
    void Haptics.notificationAsync(
      completed
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success,
    );
    if (!completed) {
      scale.set(
        withSequence(
          withTiming(0.88, { duration: motion.instant }),
          withSpring(1, motion.springBouncy),
        ),
      );
    }
    onToggle();
  };

  const dimension = Math.max(MIN_TOUCH_TARGET, size * Math.min(fontScale, 1.3));

  return (
    <AnimatedPressable
      onPress={handlePress}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: completed }}
      style={[
        animatedStyle,
        {
          width: dimension,
          height: dimension,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.full,
          backgroundColor: completed ? color : colors.surfaceAlt,
          borderWidth: completed ? 0 : 1.5,
          borderColor: colors.borderStrong,
          opacity: dimmed && !completed ? 0.5 : 1,
        },
      ]}
    >
      <Feather
        name="check"
        size={Math.round(dimension * 0.45)}
        color={completed ? readableTextOn(color) : colors.textFaint}
      />
    </AnimatedPressable>
  );
}
