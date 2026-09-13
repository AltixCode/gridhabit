import type { Habit } from '@/db/types';

import {
  EXPORT_SCHEMA_VERSION,
  exportFileName,
  toCsv,
  toJson,
  type ExportInput,
} from '../serialize';

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Meditate',
  color: '#7C5CFF',
  icon: 'moon',
  frequency: { type: 'daily' },
  createdAt: '2026-08-01',
  archived: false,
  sortOrder: 0,
  reminderEnabled: false,
  reminderTime: null,
  notificationId: 'abc',
  ...over,
});

const input: ExportInput = {
  habits: [habit()],
  completions: { h1: ['2026-08-01', '2026-08-02'] },
  exportedAt: '2026-09-13T10:00:00.000Z',
};

describe('toCsv', () => {
  it('starts with a header row', () => {
    expect(toCsv(input).split('\n')[0]).toBe(
      'habit_id,habit_name,frequency,color,archived,date',
    );
  });

  it('emits one row per completion, oldest first', () => {
    const rows = toCsv(input).trim().split('\n').slice(1);
    expect(rows).toEqual([
      'h1,Meditate,Every day,#7C5CFF,false,2026-08-01',
      'h1,Meditate,Every day,#7C5CFF,false,2026-08-02',
    ]);
  });

  it('emits a habit with no completions as a single row with an empty date', () => {
    const rows = toCsv({ ...input, completions: {} }).trim().split('\n').slice(1);
    expect(rows).toEqual(['h1,Meditate,Every day,#7C5CFF,false,']);
  });

  it('quotes and escapes a name containing a comma or a quote', () => {
    const csv = toCsv({
      ...input,
      habits: [habit({ name: 'Read, daily' })],
    });
    expect(csv).toContain('"Read, daily"');

    const quoted = toCsv({
      ...input,
      habits: [habit({ name: 'Say "hello"' })],
    });
    expect(quoted).toContain('"Say ""hello"""');
  });

  it('quotes a name containing a newline so the row count stays correct', () => {
    const csv = toCsv({ ...input, habits: [habit({ name: 'Line\nbreak' })] });
    expect(csv).toContain('"Line\nbreak"');
  });

  it('neutralises a leading =, +, - or @ so a spreadsheet cannot execute it', () => {
    // CSV injection: Excel and Sheets treat a leading `=` as a formula.
    const csv = toCsv({ ...input, habits: [habit({ name: '=HYPERLINK("evil")' })] });
    expect(csv).not.toMatch(/,=HYPERLINK/);
    expect(csv).toContain("'=HYPERLINK");
  });

  it('describes each frequency in a human-readable way', () => {
    const csv = toCsv({
      ...input,
      habits: [habit({ frequency: { type: 'custom', days: [1, 3, 5] } })],
      completions: { h1: ['2026-08-03'] },
    });
    expect(csv).toContain('"Mon, Wed, Fri"');
  });

  it('marks an archived habit', () => {
    const csv = toCsv({ ...input, habits: [habit({ archived: true })] });
    expect(csv).toContain(',true,');
  });

  it('produces only a header for an empty export', () => {
    expect(toCsv({ habits: [], completions: {}, exportedAt: input.exportedAt }).trim()).toBe(
      'habit_id,habit_name,frequency,color,archived,date',
    );
  });

  it('ends with a trailing newline', () => {
    expect(toCsv(input).endsWith('\n')).toBe(true);
  });
});

describe('toJson', () => {
  it('is valid JSON carrying a schema version', () => {
    const parsed = JSON.parse(toJson(input));
    expect(parsed.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(parsed.exportedAt).toBe('2026-09-13T10:00:00.000Z');
  });

  it('includes every habit field a re-import would need', () => {
    const parsed = JSON.parse(toJson(input));
    expect(parsed.habits[0]).toEqual({
      id: 'h1',
      name: 'Meditate',
      color: '#7C5CFF',
      icon: 'moon',
      frequency: { type: 'daily' },
      createdAt: '2026-08-01',
      archived: false,
      sortOrder: 0,
      completions: ['2026-08-01', '2026-08-02'],
    });
  });

  it('omits device-local scheduling state that means nothing elsewhere', () => {
    const parsed = JSON.parse(toJson(input));
    expect(parsed.habits[0]).not.toHaveProperty('notificationId');
    expect(parsed.habits[0]).not.toHaveProperty('reminderEnabled');
  });

  it('represents a habit with no completions as an empty array', () => {
    const parsed = JSON.parse(toJson({ ...input, completions: {} }));
    expect(parsed.habits[0].completions).toEqual([]);
  });

  it('handles an empty export', () => {
    const parsed = JSON.parse(
      toJson({ habits: [], completions: {}, exportedAt: input.exportedAt }),
    );
    expect(parsed.habits).toEqual([]);
  });

  it('round-trips a name with characters that would break CSV', () => {
    const parsed = JSON.parse(
      toJson({ ...input, habits: [habit({ name: 'Say "hi", now\n' })] }),
    );
    expect(parsed.habits[0].name).toBe('Say "hi", now\n');
  });
});

describe('exportFileName', () => {
  it('names the file by date and format', () => {
    expect(exportFileName('csv', '2026-09-13')).toBe('gridhabit-2026-09-13.csv');
    expect(exportFileName('json', '2026-09-13')).toBe('gridhabit-2026-09-13.json');
  });
});
