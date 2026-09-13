import type { Frequency } from '../frequency';
import {
  calculateCompletionRate,
  calculateLongestStreak,
  calculateStreak,
  summarizeHabit,
} from '../streak';

const daily: Frequency = { type: 'daily' };
const mwf: Frequency = { type: 'custom', days: [1, 3, 5] };
const twiceWeekly: Frequency = { type: 'weekly', timesPerWeek: 2 };

describe('calculateStreak — daily', () => {
  it('is 0 with no completions', () => {
    expect(calculateStreak([], daily, '2026-09-13')).toBe(0);
  });

  it('counts today plus the preceding consecutive days', () => {
    const dates = ['2026-09-11', '2026-09-12', '2026-09-13'];
    expect(calculateStreak(dates, daily, '2026-09-13')).toBe(3);
  });

  it('keeps yesterday-anchored streaks alive while today is still pending', () => {
    const dates = ['2026-09-10', '2026-09-11', '2026-09-12'];
    expect(calculateStreak(dates, daily, '2026-09-13')).toBe(3);
  });

  it('is 0 once two days have been missed', () => {
    const dates = ['2026-09-09', '2026-09-10', '2026-09-11'];
    expect(calculateStreak(dates, daily, '2026-09-13')).toBe(0);
  });

  it('stops at the first gap', () => {
    const dates = ['2026-09-08', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'];
    expect(calculateStreak(dates, daily, '2026-09-13')).toBe(4);
  });

  it('ignores duplicate and unsorted input', () => {
    const dates = ['2026-09-13', '2026-09-11', '2026-09-12', '2026-09-12'];
    expect(calculateStreak(dates, daily, '2026-09-13')).toBe(3);
  });

  it('ignores completions logged in the future', () => {
    const dates = ['2026-09-13', '2026-09-14', '2026-09-15'];
    expect(calculateStreak(dates, daily, '2026-09-13')).toBe(1);
  });

  // §3.3 regression guard: a streak spanning a DST transition must not break.
  it('survives the spring-forward DST night', () => {
    const dates = ['2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09'];
    expect(calculateStreak(dates, daily, '2026-03-09')).toBe(4);
  });

  it('survives the fall-back DST night', () => {
    const dates = ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'];
    expect(calculateStreak(dates, daily, '2026-11-02')).toBe(4);
  });

  it('counts a year-long streak across both DST transitions', () => {
    const dates: string[] = [];
    const d = new Date(2026, 0, 1, 12);
    for (let i = 0; i < 365; i += 1) {
      dates.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate(),
        ).padStart(2, '0')}`,
      );
      d.setDate(d.getDate() + 1);
    }
    expect(calculateStreak(dates, daily, '2026-12-31')).toBe(365);
  });
});

describe('calculateStreak — custom weekdays', () => {
  it('skips days the habit is not due on', () => {
    // Mon 14th, Wed 16th, Fri 18th of Sep 2026 — Sat 19th is not due.
    const dates = ['2026-09-14', '2026-09-16', '2026-09-18'];
    expect(calculateStreak(dates, mwf, '2026-09-19')).toBe(3);
  });

  it('breaks when a due day is missed', () => {
    const dates = ['2026-09-14', '2026-09-18'];
    expect(calculateStreak(dates, mwf, '2026-09-18')).toBe(1);
  });

  it('does not penalise the user on a due day that has not ended yet', () => {
    // Today is Fri 18th and not yet done; Mon+Wed were.
    const dates = ['2026-09-14', '2026-09-16'];
    expect(calculateStreak(dates, mwf, '2026-09-18')).toBe(2);
  });

  it('is 0 for a custom habit with no selected days', () => {
    expect(calculateStreak(['2026-09-14'], { type: 'custom', days: [] }, '2026-09-14')).toBe(0);
  });
});

describe('calculateStreak — weekly quota', () => {
  it('counts consecutive weeks that met the quota', () => {
    const dates = [
      // week of Sun 2026-08-30
      '2026-08-31', '2026-09-02',
      // week of Sun 2026-09-06
      '2026-09-07', '2026-09-10',
      // current week of Sun 2026-09-13
      '2026-09-13', '2026-09-14',
    ];
    expect(calculateStreak(dates, twiceWeekly, '2026-09-14')).toBe(3);
  });

  it('does not break the streak for a current week still in progress', () => {
    const dates = ['2026-08-31', '2026-09-02', '2026-09-07', '2026-09-10', '2026-09-13'];
    expect(calculateStreak(dates, twiceWeekly, '2026-09-14')).toBe(2);
  });

  it('breaks when a completed past week fell short of the quota', () => {
    const dates = ['2026-08-31', '2026-09-07', '2026-09-10', '2026-09-13', '2026-09-14'];
    expect(calculateStreak(dates, twiceWeekly, '2026-09-14')).toBe(2);
  });

  it('is 0 when the last completed week missed the quota and this week has none', () => {
    expect(calculateStreak(['2026-09-07'], twiceWeekly, '2026-09-14')).toBe(0);
  });
});

describe('calculateLongestStreak', () => {
  it('is 0 with no completions', () => {
    expect(calculateLongestStreak([], daily)).toBe(0);
  });

  it('finds the longest historical run, not the current one', () => {
    const dates = [
      '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05',
      '2026-02-01', '2026-02-02',
    ];
    expect(calculateLongestStreak(dates, daily)).toBe(5);
  });

  it('counts a single completion as 1', () => {
    expect(calculateLongestStreak(['2026-01-01'], daily)).toBe(1);
  });

  it('ignores non-due days for a custom habit', () => {
    const dates = ['2026-09-14', '2026-09-16', '2026-09-18', '2026-09-21'];
    expect(calculateLongestStreak(dates, mwf)).toBe(4);
  });

  it('counts qualifying weeks for a weekly-quota habit', () => {
    const dates = ['2026-08-31', '2026-09-02', '2026-09-07', '2026-09-10'];
    expect(calculateLongestStreak(dates, twiceWeekly)).toBe(2);
  });
});

describe('calculateCompletionRate', () => {
  it('is 0 when there are no due days yet', () => {
    expect(calculateCompletionRate([], daily, '2026-09-13', '2026-09-12')).toBe(0);
  });

  it('is 1 when every due day since creation is complete', () => {
    const dates = ['2026-09-11', '2026-09-12', '2026-09-13'];
    expect(calculateCompletionRate(dates, daily, '2026-09-11', '2026-09-13')).toBe(1);
  });

  it('is the completed fraction of due days', () => {
    const dates = ['2026-09-11', '2026-09-13'];
    expect(calculateCompletionRate(dates, daily, '2026-09-11', '2026-09-14')).toBeCloseTo(0.5);
  });

  it('only counts due days for a custom habit', () => {
    // Mon 14 → Sat 19 has 3 due days (Mon, Wed, Fri); 2 completed.
    const dates = ['2026-09-14', '2026-09-16'];
    expect(calculateCompletionRate(dates, mwf, '2026-09-14', '2026-09-19')).toBeCloseTo(2 / 3);
  });

  it('never exceeds 1 even with stray extra completions', () => {
    const dates = ['2026-09-13', '2026-09-14', '2026-09-15'];
    expect(calculateCompletionRate(dates, mwf, '2026-09-14', '2026-09-14')).toBeLessThanOrEqual(1);
  });
});

describe('summarizeHabit', () => {
  it('bundles the stats a detail screen needs', () => {
    const dates = ['2026-09-11', '2026-09-12', '2026-09-13'];
    const summary = summarizeHabit(dates, daily, '2026-09-01', '2026-09-13');
    expect(summary).toEqual({
      currentStreak: 3,
      longestStreak: 3,
      completionRate: expect.any(Number),
      totalCompletions: 3,
      isCompletedToday: true,
      isDueToday: true,
    });
  });

  it('reports today as incomplete when it has not been logged', () => {
    const summary = summarizeHabit(['2026-09-12'], daily, '2026-09-01', '2026-09-13');
    expect(summary.isCompletedToday).toBe(false);
    expect(summary.totalCompletions).toBe(1);
  });

  it('reports a non-due day for a custom habit', () => {
    const summary = summarizeHabit([], mwf, '2026-09-01', '2026-09-13');
    expect(summary.isDueToday).toBe(false);
  });
});
