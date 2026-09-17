/**
 * How much history the activity grid shows at a given width.
 *
 * It used to be a hardcoded 14 weeks on every device, so on a wide tablet the
 * grid occupied a fixed ~161pt of an 880pt row and left the rest of the row
 * empty. That is the same failure an Android tablet would show, which is why
 * this is derived from *measured width* rather than from a device breakpoint --
 * there is no phone/tablet question here, only "how much room is there".
 */
import { weeksForWidth } from '../HabitCard';

describe('weeksForWidth', () => {
  it('falls back to the old fixed value before the row has been measured', () => {
    // First frame: onLayout has not fired. Showing nothing would be worse.
    expect(weeksForWidth(0)).toBe(14);
  });

  it('shows more history when there is more room', () => {
    expect(weeksForWidth(600)).toBeGreaterThan(weeksForWidth(200));
  });

  it('fills the width it is given, until the upper clamp takes over', () => {
    // Below the clamp the grid should leave less than one column unused.
    // Above it the clamp is deliberately in charge, so "fills the width" stops
    // being the contract -- asserting it there would be asserting the bug the
    // clamp exists to prevent.
    const width = 200;
    const used = weeksForWidth(width) * (9 + 2.5);
    expect(width - used).toBeLessThan(9 + 2.5);
    expect(weeksForWidth(width)).toBeLessThan(30);
  });

  it('never collapses to a stub on a narrow phone', () => {
    expect(weeksForWidth(40)).toBeGreaterThanOrEqual(8);
  });

  it('never renders a year of history on a very wide display', () => {
    // A 13" iPad row, and beyond. More than ~30 weeks stops being a glanceable
    // summary and starts being a chart nobody asked for.
    expect(weeksForWidth(880)).toBeLessThanOrEqual(30);
    expect(weeksForWidth(4000)).toBeLessThanOrEqual(30);
  });

  it('is monotonic — more width never shows less history', () => {
    let previous = 0;
    for (const w of [0.1, 50, 120, 300, 480, 700, 880, 1200]) {
      const weeks = weeksForWidth(w);
      expect(weeks).toBeGreaterThanOrEqual(previous);
      previous = weeks;
    }
  });
});
