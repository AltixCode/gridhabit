import {
  describeFrequency,
  dueDaysInRange,
  isHabitDueOn,
  parseFrequency,
  serializeFrequency,
  type Frequency,
} from '../frequency';

const daily: Frequency = { type: 'daily' };
const mwf: Frequency = { type: 'custom', days: [1, 3, 5] };
const threeTimesWeekly: Frequency = { type: 'weekly', timesPerWeek: 3 };

describe('isHabitDueOn', () => {
  it('is always due for a daily habit', () => {
    expect(isHabitDueOn(daily, '2026-09-13')).toBe(true);
    expect(isHabitDueOn(daily, '2026-09-14')).toBe(true);
  });

  it('is due only on the selected weekdays for a custom habit', () => {
    // 2026-09-13 Sun, 14 Mon, 15 Tue, 16 Wed, 17 Thu, 18 Fri, 19 Sat
    expect(isHabitDueOn(mwf, '2026-09-13')).toBe(false);
    expect(isHabitDueOn(mwf, '2026-09-14')).toBe(true);
    expect(isHabitDueOn(mwf, '2026-09-15')).toBe(false);
    expect(isHabitDueOn(mwf, '2026-09-16')).toBe(true);
    expect(isHabitDueOn(mwf, '2026-09-17')).toBe(false);
    expect(isHabitDueOn(mwf, '2026-09-18')).toBe(true);
    expect(isHabitDueOn(mwf, '2026-09-19')).toBe(false);
  });

  it('treats a weekly-quota habit as available on any day', () => {
    expect(isHabitDueOn(threeTimesWeekly, '2026-09-13')).toBe(true);
    expect(isHabitDueOn(threeTimesWeekly, '2026-09-17')).toBe(true);
  });

  it('is never due for a custom habit with no selected days', () => {
    expect(isHabitDueOn({ type: 'custom', days: [] }, '2026-09-14')).toBe(false);
  });
});

describe('dueDaysInRange', () => {
  it('lists every day for a daily habit', () => {
    expect(dueDaysInRange(daily, '2026-09-13', '2026-09-16')).toEqual([
      '2026-09-13',
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
    ]);
  });

  it('lists only matching weekdays for a custom habit', () => {
    expect(dueDaysInRange(mwf, '2026-09-13', '2026-09-19')).toEqual([
      '2026-09-14',
      '2026-09-16',
      '2026-09-18',
    ]);
  });

  it('returns an empty list when the range is inverted', () => {
    expect(dueDaysInRange(daily, '2026-09-16', '2026-09-13')).toEqual([]);
  });
});

describe('parseFrequency / serializeFrequency', () => {
  it('round-trips each frequency shape', () => {
    for (const f of [daily, mwf, threeTimesWeekly]) {
      expect(parseFrequency(serializeFrequency(f))).toEqual(f);
    }
  });

  it('falls back to daily on malformed stored JSON', () => {
    expect(parseFrequency('{{{')).toEqual(daily);
    expect(parseFrequency('')).toEqual(daily);
    expect(parseFrequency('{"type":"hourly"}')).toEqual(daily);
  });

  it('accepts the legacy plain-string encodings', () => {
    expect(parseFrequency('daily')).toEqual(daily);
  });

  it('clamps an out-of-range weekly quota into 1..7', () => {
    expect(parseFrequency('{"type":"weekly","timesPerWeek":0}')).toEqual({
      type: 'weekly',
      timesPerWeek: 1,
    });
    expect(parseFrequency('{"type":"weekly","timesPerWeek":99}')).toEqual({
      type: 'weekly',
      timesPerWeek: 7,
    });
  });

  it('drops invalid weekday indices from a custom frequency', () => {
    expect(parseFrequency('{"type":"custom","days":[1,9,-2,3,3]}')).toEqual({
      type: 'custom',
      days: [1, 3],
    });
  });
});

describe('describeFrequency', () => {
  it('produces a translatable descriptor for each shape', () => {
    // A descriptor, not prose: this file cannot import `t()`, which lives
    // behind `expo-localization`. `src/i18n/frequency.test.ts` covers the
    // English text `frequencyLabel` builds from these.
    expect(describeFrequency(daily)).toEqual({ kind: 'everyDay' });
    expect(describeFrequency(threeTimesWeekly)).toEqual({ kind: 'timesPerWeek', n: 3 });
    expect(describeFrequency(mwf)).toEqual({ kind: 'customDays', days: [1, 3, 5] });
    expect(describeFrequency({ type: 'custom', days: [] })).toEqual({ kind: 'noDaysSelected' });
    expect(describeFrequency({ type: 'custom', days: [0, 1, 2, 3, 4, 5, 6] })).toEqual({
      kind: 'everyDay',
    });
  });
});
