/**
 * The contribution grid has to be visible.
 *
 * It is the app's namesake feature -- "watch the pattern build" -- and it was
 * shipped invisible: in the dark theme an empty cell was #1D1D20 on a #151517
 * card, a contrast ratio of **1.08:1**. The squares were all present, correctly
 * laid out and correctly labelled for screen readers; they simply were not
 * distinguishable from the card behind them. Nothing failed, so nothing caught
 * it until someone looked at the screen.
 *
 * These bounds exist so a palette edit cannot quietly do it again. The floor is
 * WCAG 1.4.11 non-text contrast (3:1) for the missed state, which carries real
 * meaning, and a slightly softer 2.4:1 for the empty state, which only has to
 * read as a grid. Both are an order of magnitude above what shipped.
 */
import { contrastRatio } from '../color';
import { darkPalette, lightPalette } from '../tokens';

describe.each([
  ['light', lightPalette],
  ['dark', darkPalette],
])('%s theme contribution grid', (_name, palette) => {
  // The grid is rendered inside a <Card>, so the surface is what a cell is
  // actually seen against -- not the screen background.
  it('shows an empty cell against the card it sits on', () => {
    expect(contrastRatio(palette.gridEmpty, palette.surface)).toBeGreaterThanOrEqual(2.4);
  });

  it('shows a missed cell at the non-text contrast floor', () => {
    expect(contrastRatio(palette.gridMissed, palette.surface)).toBeGreaterThanOrEqual(3);
  });

  it('keeps missed and empty distinguishable from each other', () => {
    expect(contrastRatio(palette.gridMissed, palette.gridEmpty)).toBeGreaterThan(1.15);
  });

  it('never lets a cell outshine the text it sits beside', () => {
    // A guard in the other direction: these are background chips, so pushing
    // them for contrast must not turn the card into a light panel.
    expect(contrastRatio(palette.text, palette.surface)).toBeGreaterThan(
      contrastRatio(palette.gridMissed, palette.surface),
    );
  });
});
