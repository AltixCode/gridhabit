import {
  addDays,
  compareDateKeys,
  dateKeyFromDate,
  daysBetween,
  endOfWeek,
  formatDateKeyLong,
  isValidDateKey,
  parseDateKey,
  startOfWeek,
  todayKey,
} from '../dates';

describe('dateKeyFromDate', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(dateKeyFromDate(new Date(2026, 0, 5, 13, 45))).toBe('2026-01-05');
  });

  it('zero-pads single-digit months and days', () => {
    expect(dateKeyFromDate(new Date(2026, 8, 9, 0, 0))).toBe('2026-09-09');
  });

  it('uses the LOCAL calendar day even just before midnight', () => {
    // 23:59 local on Dec 31 is still Dec 31 locally, even though it may be
    // Jan 1 in UTC for positive offsets.
    expect(dateKeyFromDate(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
  });

  it('uses the LOCAL calendar day just after midnight', () => {
    // 00:01 local on Jan 1 is still Jan 1 locally, even though it may be
    // Dec 31 in UTC for negative offsets.
    expect(dateKeyFromDate(new Date(2026, 0, 1, 0, 1, 0))).toBe('2026-01-01');
  });
});

describe('parseDateKey', () => {
  it('round-trips with dateKeyFromDate', () => {
    expect(dateKeyFromDate(parseDateKey('2026-03-08'))).toBe('2026-03-08');
  });

  it('returns a local-noon date so DST shifts cannot move the day', () => {
    const d = parseDateKey('2026-03-08');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(8);
    expect(d.getHours()).toBe(12);
  });

  it('throws on a malformed key', () => {
    expect(() => parseDateKey('2026-3-8')).toThrow();
    expect(() => parseDateKey('not-a-date')).toThrow();
  });
});

describe('isValidDateKey', () => {
  it.each([
    ['2026-01-01', true],
    ['2026-12-31', true],
    ['2026-02-30', false],
    ['2026-13-01', false],
    ['2026-00-10', false],
    ['26-01-01', false],
    ['', false],
  ])('%s -> %s', (key, expected) => {
    expect(isValidDateKey(key)).toBe(expected);
  });
});

describe('addDays', () => {
  it('adds days across a month boundary', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
  });

  it('subtracts days across a year boundary', () => {
    expect(addDays('2026-01-02', -3)).toBe('2025-12-30');
  });

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('is a no-op for zero', () => {
    expect(addDays('2026-06-15', 0)).toBe('2026-06-15');
  });

  // §3.3: the DST-transition regression guard. US DST starts 2026-03-08 and
  // ends 2026-11-01. Naive `+ 86400000` arithmetic skips or repeats a day here.
  it('crosses the spring-forward DST boundary exactly once', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-03-09', -1)).toBe('2026-03-08');
  });

  it('crosses the fall-back DST boundary exactly once', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(addDays('2026-11-02', -1)).toBe('2026-11-01');
  });

  it('walks a full year one day at a time and lands exactly 365 days later', () => {
    let key = '2026-01-01';
    for (let i = 0; i < 365; i += 1) key = addDays(key, 1);
    expect(key).toBe('2027-01-01');
  });
});

describe('daysBetween', () => {
  it('returns 0 for the same day', () => {
    expect(daysBetween('2026-05-01', '2026-05-01')).toBe(0);
  });

  it('returns a positive count when `to` is later', () => {
    expect(daysBetween('2026-05-01', '2026-05-04')).toBe(3);
  });

  it('returns a negative count when `to` is earlier', () => {
    expect(daysBetween('2026-05-04', '2026-05-01')).toBe(-3);
  });

  it('is exact across a spring-forward DST boundary', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
  });

  it('is exact across a fall-back DST boundary', () => {
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
  });
});

describe('startOfWeek / endOfWeek', () => {
  // 2026-09-13 is a Sunday.
  it('treats Sunday as the first day by default', () => {
    expect(startOfWeek('2026-09-16')).toBe('2026-09-13');
    expect(endOfWeek('2026-09-16')).toBe('2026-09-19');
  });

  it('is idempotent on a boundary day', () => {
    expect(startOfWeek('2026-09-13')).toBe('2026-09-13');
    expect(endOfWeek('2026-09-19')).toBe('2026-09-19');
  });

  it('supports a Monday week start', () => {
    expect(startOfWeek('2026-09-13', 1)).toBe('2026-09-07');
    expect(endOfWeek('2026-09-13', 1)).toBe('2026-09-13');
  });
});

describe('todayKey', () => {
  it('returns the local date key for the supplied clock', () => {
    expect(todayKey(new Date(2026, 6, 4, 23, 30))).toBe('2026-07-04');
  });

  it('defaults to the current time and returns a valid key', () => {
    expect(isValidDateKey(todayKey())).toBe(true);
  });
});

describe('compareDateKeys', () => {
  it('orders lexicographically, which matches chronological order', () => {
    const keys = ['2026-10-02', '2026-09-30', '2027-01-01'];
    expect([...keys].sort(compareDateKeys)).toEqual([
      '2026-09-30',
      '2026-10-02',
      '2027-01-01',
    ]);
  });
});

describe('formatDateKeyLong', () => {
  it('renders a human-readable label', () => {
    expect(formatDateKeyLong('2026-09-13')).toMatch(/Sep/);
    expect(formatDateKeyLong('2026-09-13')).toMatch(/13/);
  });
});
