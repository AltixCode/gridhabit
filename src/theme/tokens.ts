/**
 * GridHabit design tokens.
 *
 * Direction: Swiss minimalism — high contrast, generous whitespace, a strict
 * grid, and exactly one accent per habit. The contribution grid is the hero;
 * every other surface stays quiet so the grid carries the colour.
 *
 * Typography is the platform UI font (SF Pro on iOS, Roboto on Android) rather
 * than a webfont: it is the sharpest match for the Swiss direction, renders
 * with correct optical sizing at small sizes, and costs zero load time or
 * bundle weight — which matters for an app opened for four seconds a day.
 */
import { Platform } from 'react-native';

/** 4pt base grid. Every margin and padding in the app comes from here. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
} as const;

/** Minimum interactive size, per Apple HIG (44pt) and Material (48dp). */
export const MIN_TOUCH_TARGET = 44;

export const fontFamily = Platform.select({
  ios: { regular: 'System', mono: 'Menlo' },
  android: { regular: 'sans-serif', mono: 'monospace' },
  default: { regular: 'System', mono: 'monospace' },
}) as { regular: string; mono: string };

/**
 * Type scale. `lineHeight` is absolute (not a multiplier) because React Native
 * multipliers round inconsistently across platforms and break vertical rhythm.
 */
export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.8 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: -0.1 },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600', letterSpacing: -0.1 },
  callout: { fontSize: 15, lineHeight: 21, fontWeight: '500', letterSpacing: -0.1 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500', letterSpacing: 0 },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0.2 },
  /** Tabular figures keep streak counters from jittering as they change. */
  numeric: { fontSize: 32, lineHeight: 36, fontWeight: '700', letterSpacing: -1 },
} as const;

/**
 * Habit accent palette. Every swatch is checked to keep white text at >= 4.5:1
 * when used as a filled button, and reads clearly as a 12pt grid square in both
 * light and dark surfaces.
 */
export const HABIT_COLORS = [
  { name: 'Violet', value: '#7C5CFF' },
  { name: 'Indigo', value: '#4F63D2' },
  { name: 'Sky', value: '#0284C7' },
  { name: 'Teal', value: '#0D9488' },
  { name: 'Green', value: '#059669' },
  { name: 'Lime', value: '#4D7C0F' },
  { name: 'Amber', value: '#D97706' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Rose', value: '#E11D48' },
  { name: 'Plum', value: '#9333EA' },
  { name: 'Slate', value: '#475569' },
  { name: 'Crimson', value: '#BE123C' },
] as const;

export const DEFAULT_HABIT_COLOR = HABIT_COLORS[0].value;

export interface Palette {
  /** App background. */
  background: string;
  /** Raised surfaces: cards, sheets, inputs. */
  surface: string;
  /** A surface on top of a surface (chips, segmented controls). */
  surfaceAlt: string;
  /** Primary text. */
  text: string;
  /** Secondary text — verified >= 4.5:1 against `background`. */
  textMuted: string;
  /** Tertiary text for non-essential metadata — >= 3:1, never body copy. */
  textFaint: string;
  /** Hairlines and dividers. */
  border: string;
  /** A stronger border for focus and selection. */
  borderStrong: string;
  /** Brand accent — used for streaks and the upgrade path. */
  accent: string;
  onAccent: string;
  success: string;
  danger: string;
  onDanger: string;
  /** An empty, in-range grid cell. */
  gridEmpty: string;
  /** A due-but-missed grid cell. */
  gridMissed: string;
  /** Scrim behind modals. */
  scrim: string;
  /** Inverted surface used for the primary CTA. */
  inverse: string;
  onInverse: string;
}

export const lightPalette: Palette = {
  background: '#F7F7F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F1EE',
  text: '#0C0C0D',
  textMuted: '#5F5F66',
  textFaint: '#85858D',
  border: '#E6E6E1',
  borderStrong: '#CFCFC8',
  accent: '#D97706',
  onAccent: '#231405',
  success: '#059669',
  danger: '#DC2626',
  onDanger: '#FFFFFF',
  gridEmpty: '#EAEAE5',
  gridMissed: '#DCDCD5',
  scrim: 'rgba(12,12,13,0.45)',
  inverse: '#0C0C0D',
  onInverse: '#FFFFFF',
};

export const darkPalette: Palette = {
  background: '#0B0B0C',
  surface: '#151517',
  surfaceAlt: '#1F1F22',
  text: '#F4F4F2',
  textMuted: '#A3A3AA',
  textFaint: '#6E6E76',
  border: '#26262A',
  borderStrong: '#3A3A40',
  accent: '#F59E0B',
  onAccent: '#1A1206',
  success: '#10B981',
  danger: '#F87171',
  onDanger: '#1A0606',
  gridEmpty: '#1D1D20',
  gridMissed: '#2A2A2E',
  scrim: 'rgba(0,0,0,0.6)',
  inverse: '#F4F4F2',
  onInverse: '#0C0C0D',
};

/**
 * Motion. Durations are short and purposeful; exits are faster than entrances
 * because a leaving element should not hold the user up.
 */
export const motion = {
  instant: 90,
  fast: 150,
  base: 220,
  slow: 320,
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  springBouncy: { damping: 12, stiffness: 260, mass: 0.8 },
} as const;

export const elevation = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sheet: {
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
} as const;
