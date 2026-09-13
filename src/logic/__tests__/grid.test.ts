import type { Frequency } from '../frequency';
import { buildContributionGrid, gridMonthLabels } from '../grid';

const daily: Frequency = { type: 'daily' };
const mwf: Frequency = { type: 'custom', days: [1, 3, 5] };

const opts = {
  today: '2026-09-16', // Wednesday
  createdAt: '2020-01-01',
  frequency: daily,
};

describe('buildContributionGrid', () => {
  it('returns exactly `weeks` columns of 7 cells each', () => {
    const grid = buildContributionGrid([], { ...opts, weeks: 12 });
    expect(grid).toHaveLength(12);
    for (const column of grid) expect(column).toHaveLength(7);
  });

  it('places today in the last column on its weekday row', () => {
    const grid = buildContributionGrid([], { ...opts, weeks: 4 });
    const lastColumn = grid[grid.length - 1]!;
    expect(lastColumn[3]!.date).toBe('2026-09-16'); // Wednesday = index 3
    expect(lastColumn[3]!.isToday).toBe(true);
  });

  it('marks days after today as out of range', () => {
    const grid = buildContributionGrid([], { ...opts, weeks: 4 });
    const lastColumn = grid[grid.length - 1]!;
    expect(lastColumn[4]!.isFuture).toBe(true);
    expect(lastColumn[6]!.isFuture).toBe(true);
    expect(lastColumn[3]!.isFuture).toBe(false);
  });

  it('marks days before the habit was created as out of range', () => {
    const grid = buildContributionGrid([], {
      ...opts,
      weeks: 2,
      createdAt: '2026-09-14',
    });
    const flat = grid.flat();
    expect(flat.find((c) => c.date === '2026-09-13')!.isBeforeStart).toBe(true);
    expect(flat.find((c) => c.date === '2026-09-14')!.isBeforeStart).toBe(false);
  });

  it('marks completed days', () => {
    const grid = buildContributionGrid(['2026-09-14', '2026-09-16'], { ...opts, weeks: 2 });
    const flat = grid.flat();
    expect(flat.find((c) => c.date === '2026-09-14')!.completed).toBe(true);
    expect(flat.find((c) => c.date === '2026-09-15')!.completed).toBe(false);
    expect(flat.find((c) => c.date === '2026-09-16')!.completed).toBe(true);
  });

  it('flags whether each in-range day was due', () => {
    const grid = buildContributionGrid([], { ...opts, weeks: 2, frequency: mwf });
    const flat = grid.flat();
    expect(flat.find((c) => c.date === '2026-09-14')!.isDue).toBe(true);
    expect(flat.find((c) => c.date === '2026-09-15')!.isDue).toBe(false);
  });

  it('flags a missed day: due, in range, past and not completed', () => {
    const grid = buildContributionGrid(['2026-09-16'], { ...opts, weeks: 2 });
    const flat = grid.flat();
    expect(flat.find((c) => c.date === '2026-09-15')!.isMissed).toBe(true);
    expect(flat.find((c) => c.date === '2026-09-16')!.isMissed).toBe(false); // completed
    expect(flat.find((c) => c.date === '2026-09-17')!.isMissed).toBe(false); // future
  });

  it('never flags today as missed', () => {
    const grid = buildContributionGrid([], { ...opts, weeks: 2 });
    const flat = grid.flat();
    expect(flat.find((c) => c.date === '2026-09-16')!.isMissed).toBe(false);
  });

  it('produces cells in strictly ascending date order when flattened by column', () => {
    const grid = buildContributionGrid([], { ...opts, weeks: 6 });
    const flat = grid.flat().map((c) => c.date);
    const sorted = [...flat].sort();
    expect(flat).toEqual(sorted);
    expect(new Set(flat).size).toBe(flat.length);
  });

  it('spans a contiguous run of days across a DST transition', () => {
    const grid = buildContributionGrid([], {
      ...opts,
      today: '2026-03-14',
      weeks: 4,
    });
    const flat = grid.flat().map((c) => c.date);
    expect(flat).toContain('2026-03-07');
    expect(flat).toContain('2026-03-08');
    expect(flat).toContain('2026-03-09');
    expect(flat.filter((d) => d === '2026-03-08')).toHaveLength(1);
  });

  it('handles a habit created today with no completions', () => {
    const grid = buildContributionGrid([], {
      ...opts,
      weeks: 52,
      createdAt: '2026-09-16',
    });
    const flat = grid.flat();
    expect(flat.filter((c) => c.completed)).toHaveLength(0);
    expect(flat.filter((c) => c.isMissed)).toHaveLength(0);
  });

  it('ignores completions outside the rendered window', () => {
    const grid = buildContributionGrid(['2019-01-01', '2026-09-16'], { ...opts, weeks: 2 });
    expect(grid.flat().filter((c) => c.completed)).toHaveLength(1);
  });

  it('coerces a weeks count below 1 up to 1', () => {
    expect(buildContributionGrid([], { ...opts, weeks: 0 })).toHaveLength(1);
  });

  it('supports a Monday week start', () => {
    const grid = buildContributionGrid([], { ...opts, weeks: 2, weekStartsOn: 1 });
    expect(grid[0]![0]!.weekday).toBe(1);
    const lastColumn = grid[grid.length - 1]!;
    expect(lastColumn[2]!.date).toBe('2026-09-16'); // Wed is index 2 in a Mon-first week
  });
});

describe('gridMonthLabels', () => {
  it('labels the first column of each month once', () => {
    const grid = buildContributionGrid([], { ...opts, weeks: 20 });
    const labels = gridMonthLabels(grid);
    expect(labels).toHaveLength(20);
    const named = labels.filter((l) => l !== '');
    expect(named.length).toBeGreaterThan(2);
    expect(new Set(named).size).toBe(named.length);
  });
});
