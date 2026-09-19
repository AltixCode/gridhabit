import * as Localization from 'expo-localization';

import { resetLanguageCache } from '..';
import { frequencyLabel, weekdayNarrow, weekdayShort } from '../frequency';

const getLocales = Localization.getLocales as jest.Mock;

function speak(languageCode: string) {
  resetLanguageCache();
  getLocales.mockReturnValue([{ languageCode }]);
}

beforeEach(() => {
  jest.clearAllMocks();
  speak('en');
});

describe('weekdayShort', () => {
  it('gives the English short weekday name for each index', () => {
    expect(weekdayShort(0)).toBe('Sun');
    expect(weekdayShort(1)).toBe('Mon');
    expect(weekdayShort(6)).toBe('Sat');
  });

  it('follows the active device language', () => {
    speak('es');
    // Not asserting the exact accented string -- CLDR data can change format
    // (e.g. with or without a trailing period) between ICU versions. The
    // contract this app depends on is "it is not the English name".
    expect(weekdayShort(1)).not.toBe('Mon');
  });
});

describe('weekdayNarrow', () => {
  it('gives a one-character English label for each index', () => {
    expect(weekdayNarrow(0)).toBe('S');
    expect(weekdayNarrow(1)).toBe('M');
    expect(weekdayNarrow(2)).toBe('T');
  });
});

describe('frequencyLabel', () => {
  it('describes a daily habit', () => {
    expect(frequencyLabel({ type: 'daily' })).toBe('Every day');
  });

  it('describes a weekly-quota habit', () => {
    expect(frequencyLabel({ type: 'weekly', timesPerWeek: 3 })).toBe('3× per week');
  });

  it('describes a custom habit with no days selected', () => {
    expect(frequencyLabel({ type: 'custom', days: [] })).toBe('No days selected');
  });

  it('joins the selected weekdays for a custom habit', () => {
    expect(frequencyLabel({ type: 'custom', days: [1, 3, 5] })).toBe('Mon, Wed, Fri');
  });

  it('collapses a custom habit with every day selected to "Every day"', () => {
    expect(frequencyLabel({ type: 'custom', days: [0, 1, 2, 3, 4, 5, 6] })).toBe('Every day');
  });
});
