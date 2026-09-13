import { HABIT_COLORS, darkPalette, lightPalette } from '../tokens';
import { contrastRatio, mix, readableTextOn, withAlpha } from '../color';

describe('mix', () => {
  it('returns the background at amount 0', () => {
    expect(mix('#FF0000', '#FFFFFF', 0)).toBe('#ffffff');
  });

  it('returns the colour at amount 1', () => {
    expect(mix('#FF0000', '#FFFFFF', 1)).toBe('#ff0000');
  });

  it('blends halfway', () => {
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });

  it('clamps out-of-range amounts', () => {
    expect(mix('#000000', '#FFFFFF', -1)).toBe('#ffffff');
    expect(mix('#000000', '#FFFFFF', 2)).toBe('#000000');
  });

  it('expands 3-digit hex', () => {
    expect(mix('#F00', '#FFF', 1)).toBe('#ff0000');
  });
});

describe('withAlpha', () => {
  it('emits an rgba string', () => {
    expect(withAlpha('#7C5CFF', 0.5)).toBe('rgba(124, 92, 255, 0.5)');
  });
});

describe('contrast', () => {
  it('scores black on white at 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#123456', '#FEDCBA')).toBeCloseTo(
      contrastRatio('#FEDCBA', '#123456'),
    );
  });
});

describe('readableTextOn', () => {
  it('picks white on a dark surface and black on a light one', () => {
    expect(readableTextOn('#0C0C0D')).toBe('#FFFFFF');
    expect(readableTextOn('#FFFBEB')).toBe('#000000');
  });

  it('always clears WCAG AA for every habit colour', () => {
    for (const { value } of HABIT_COLORS) {
      expect(contrastRatio(readableTextOn(value), value)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('palette accessibility', () => {
  const pairs = (p: typeof lightPalette) => [
    ['text/background', p.text, p.background],
    ['text/surface', p.text, p.surface],
    ['textMuted/background', p.textMuted, p.background],
    ['textMuted/surface', p.textMuted, p.surface],
    ['onAccent/accent', p.onAccent, p.accent],
    ['onDanger/danger', p.onDanger, p.danger],
    ['onInverse/inverse', p.onInverse, p.inverse],
  ] as const;

  it.each(pairs(lightPalette))('light %s meets AA 4.5:1', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(pairs(darkPalette))('dark %s meets AA 4.5:1', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps faint text above the 3:1 non-text threshold', () => {
    expect(contrastRatio(lightPalette.textFaint, lightPalette.background)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(darkPalette.textFaint, darkPalette.background)).toBeGreaterThanOrEqual(3);
  });
});
