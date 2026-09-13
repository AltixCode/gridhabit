import type { Frequency } from '@/logic/frequency';
import {
  buildReminderTriggers,
  formatReminderTime,
  parseReminderTime,
  reminderBody,
} from '../schedule';

describe('parseReminderTime', () => {
  it('parses a 24-hour local time', () => {
    expect(parseReminderTime('07:30')).toEqual({ hour: 7, minute: 30 });
    expect(parseReminderTime('23:59')).toEqual({ hour: 23, minute: 59 });
    expect(parseReminderTime('00:00')).toEqual({ hour: 0, minute: 0 });
  });

  it('returns null for malformed input', () => {
    for (const bad of ['7:30', '24:00', '12:60', '', 'noon', '12-30']) {
      expect(parseReminderTime(bad)).toBeNull();
    }
  });
});

describe('formatReminderTime', () => {
  it('zero-pads back to HH:mm', () => {
    expect(formatReminderTime(7, 5)).toBe('07:05');
    expect(formatReminderTime(0, 0)).toBe('00:00');
  });

  it('clamps out-of-range values instead of emitting an invalid time', () => {
    expect(formatReminderTime(30, 90)).toBe('23:59');
    expect(formatReminderTime(-2, -5)).toBe('00:00');
  });
});

describe('buildReminderTriggers', () => {
  it('returns a single daily trigger for a daily habit', () => {
    expect(buildReminderTriggers({ type: 'daily' }, '08:00')).toEqual([
      { kind: 'daily', hour: 8, minute: 0 },
    ]);
  });

  it('returns a daily trigger for a weekly-quota habit', () => {
    // A quota habit can be done any day, so a daily nudge is the right shape.
    expect(buildReminderTriggers({ type: 'weekly', timesPerWeek: 3 }, '20:15')).toEqual([
      { kind: 'daily', hour: 20, minute: 15 },
    ]);
  });

  it('returns one weekly trigger per selected weekday', () => {
    const frequency: Frequency = { type: 'custom', days: [1, 3, 5] };
    expect(buildReminderTriggers(frequency, '06:45')).toEqual([
      { kind: 'weekly', weekday: 2, hour: 6, minute: 45 },
      { kind: 'weekly', weekday: 4, hour: 6, minute: 45 },
      { kind: 'weekly', weekday: 6, hour: 6, minute: 45 },
    ]);
  });

  it('maps Sunday to expo-notifications weekday 1 and Saturday to 7', () => {
    expect(buildReminderTriggers({ type: 'custom', days: [0] }, '09:00')).toEqual([
      { kind: 'weekly', weekday: 1, hour: 9, minute: 0 },
    ]);
    expect(buildReminderTriggers({ type: 'custom', days: [6] }, '09:00')).toEqual([
      { kind: 'weekly', weekday: 7, hour: 9, minute: 0 },
    ]);
  });

  it('collapses a seven-day custom habit to one daily trigger', () => {
    const everyDay: Frequency = { type: 'custom', days: [0, 1, 2, 3, 4, 5, 6] };
    expect(buildReminderTriggers(everyDay, '10:00')).toEqual([
      { kind: 'daily', hour: 10, minute: 0 },
    ]);
  });

  it('returns nothing for a custom habit with no days', () => {
    expect(buildReminderTriggers({ type: 'custom', days: [] }, '10:00')).toEqual([]);
  });

  it('returns nothing for a malformed time rather than scheduling at midnight', () => {
    expect(buildReminderTriggers({ type: 'daily' }, 'half past eight')).toEqual([]);
    expect(buildReminderTriggers({ type: 'daily' }, null)).toEqual([]);
  });
});

describe('reminderBody', () => {
  it('mentions the habit name', () => {
    expect(reminderBody('Meditate')).toContain('Meditate');
  });

  it('handles a long name without throwing', () => {
    expect(reminderBody('x'.repeat(200))).toEqual(expect.any(String));
  });
});
