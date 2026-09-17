import React, { type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

/** A tablet, for layout purposes. The widest phone is 440pt. */
const TABLET_BREAKPOINT = 700;
/** The widest the column gets on a phone. Never binds; it is the floor a
 *  tablet widens from. */
const CONTENT_MAX_WIDTH = 640;
/** The widest it gets on a tablet. 1032pt portrait less two gutters is 984, so
 *  this binds on a 13" landscape and leaves portrait using the screen it is on. */
const TABLET_MAX_WIDTH = 920;

interface ScreenProps extends Omit<ScrollViewProps, 'children'> {
  children: ReactNode;
  scroll?: boolean;
  /** Extra bottom padding, e.g. to clear a pinned banner ad. */
  bottomInset?: number;
  padded?: boolean;
}

/**
 * Page shell. Owns the safe-area insets in one place so no screen re-derives
 * them — the notch, the home indicator and Android's gesture bar are handled
 * once, correctly.
 */
export function Screen({
  children,
  scroll = false,
  bottomInset = 0,
  padded = true,
  contentContainerStyle,
  style,
  ...rest
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  // The content column is capped and centred rather than run edge to edge.
  //
  // Every other app in this portfolio caps it inside this same component;
  // gridhabit's copy never did, so its archive, reorder and settings screens
  // stretched a phone layout across the full 1032pt of a 13" iPad -- rows of
  // text the width of the display, which is the complaint Ata raised about the
  // tablet build. The column widens on a tablet instead of holding the phone
  // measure: 640pt inside 1032 is a strip with margins wider than most phones,
  // and these screens are cards and rows, not prose.
  //
  // Deliberately no vertical centring. `justifyContent: 'center'` only has
  // slack when the content is shorter than the viewport, which on a 13" is most
  // screens, and it leaves a phone's worth of interface floating with dead
  // space above and below. Content starts at the top.
  const column = {
    width: '100%' as const,
    maxWidth: isTablet
      ? Math.min(width - spacing.xl * 2, TABLET_MAX_WIDTH)
      : CONTENT_MAX_WIDTH,
    alignSelf: 'center' as const,
  };

  const padding = {
    paddingHorizontal: padded ? spacing.base : 0,
    paddingBottom: insets.bottom + bottomInset + spacing.xl,
  };

  if (!scroll) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }, style]}>
        <View style={[styles.flex, column, padding]}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }, style]}
      contentContainerStyle={[column, padding, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
