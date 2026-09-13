import { DEMO_HABITS, createRandom, generateCompletionHistory } from '../seed';

describe('createRandom', () => {
  it('is deterministic for a given seed', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('differs across seeds', () => {
    expect(createRandom(1)()).not.toBe(createRandom(2)());
  });

  it('stays within [0, 1)', () => {
    const rand = createRandom(7);
    for (let i = 0; i < 500; i += 1) {
      const value = rand();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('generateCompletionHistory', () => {
  const params = {
    frequency: { type: 'daily' } as const,
    today: '2026-09-13',
    days: 180,
    adherence: 0.8,
    currentStreak: 12,
    seed: 3,
  };

  it('is deterministic for a given seed', () => {
    expect(generateCompletionHistory(params)).toEqual(generateCompletionHistory(params));
  });

  it('produces sorted, unique local date keys', () => {
    const dates = generateCompletionHistory(params);
    expect(dates).toEqual([...dates].sort());
    expect(new Set(dates).size).toBe(dates.length);
    for (const date of dates) expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('never generates a date in the future', () => {
    for (const date of generateCompletionHistory(params)) {
      expect(date <= params.today).toBe(true);
    }
  });

  it('guarantees an unbroken run ending today, so screenshots look alive', () => {
    const dates = new Set(generateCompletionHistory(params));
    let cursor = new Date('2026-09-13T12:00:00');
    for (let i = 0; i < params.currentStreak; i += 1) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      expect(dates.has(key)).toBe(true);
      cursor.setDate(cursor.getDate() - 1);
    }
  });

  it('roughly honours the adherence rate', () => {
    const dates = generateCompletionHistory({ ...params, adherence: 0.5, currentStreak: 0 });
    const ratio = dates.length / params.days;
    expect(ratio).toBeGreaterThan(0.3);
    expect(ratio).toBeLessThan(0.7);
  });

  it('only fills days the habit is due on', () => {
    const dates = generateCompletionHistory({
      ...params,
      frequency: { type: 'custom', days: [1, 3, 5] },
      currentStreak: 0,
    });
    for (const date of dates) {
      const weekday = new Date(`${date}T12:00:00`).getDay();
      expect([1, 3, 5]).toContain(weekday);
    }
  });

  it('returns nothing for a habit that is never due', () => {
    expect(
      generateCompletionHistory({
        ...params,
        frequency: { type: 'custom', days: [] },
        currentStreak: 0,
      }),
    ).toEqual([]);
  });

  it('handles a zero-day window', () => {
    expect(generateCompletionHistory({ ...params, days: 0, currentStreak: 0 })).toEqual([]);
  });
});

describe('DEMO_HABITS', () => {
  it('provides a varied, screenshot-ready set', () => {
    expect(DEMO_HABITS.length).toBeGreaterThanOrEqual(4);
    const kinds = new Set(DEMO_HABITS.map((h) => h.frequency.type));
    expect(kinds.size).toBeGreaterThan(1);
    expect(new Set(DEMO_HABITS.map((h) => h.color)).size).toBe(DEMO_HABITS.length);
  });
});
