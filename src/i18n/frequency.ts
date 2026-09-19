import { describeFrequency, type Frequency } from '@/logic/frequency';

import { getDeviceLanguage, t } from './index';

/**
 * The localized weekday abbreviation for `day` (0 = Sunday … 6 = Saturday).
 *
 * Built from `Intl.DateTimeFormat` rather than a hand-translated array: a
 * short weekday name is exactly what CLDR already has for every one of the
 * fourteen locales, and using it means one fewer set of 7×14 strings to keep
 * in sync by hand.
 */
export function weekdayShort(day: number): string {
  // A fixed, known Sunday (2023-01-01), advanced by `day`, so the formatter
  // only ever sees a real calendar date.
  const date = new Date(Date.UTC(2023, 0, 1 + day));
  return new Intl.DateTimeFormat(getDeviceLanguage(), { weekday: 'short', timeZone: 'UTC' }).format(
    date,
  );
}

/**
 * The narrowest weekday form CLDR has for the active language (`M`, `T`, …
 * in English) -- used where the picker shows one letter per day. Not simply
 * `weekdayShort(day)[0]`: a locale's narrow form is not always its short
 * form truncated to one character.
 */
export function weekdayNarrow(day: number): string {
  const date = new Date(Date.UTC(2023, 0, 1 + day));
  return new Intl.DateTimeFormat(getDeviceLanguage(), { weekday: 'narrow', timeZone: 'UTC' }).format(
    date,
  );
}

/** A short human label for the frequency, e.g. `Mon, Wed, Fri`. */
export function frequencyLabel(frequency: Frequency): string {
  const descriptor = describeFrequency(frequency);
  switch (descriptor.kind) {
    case 'everyDay':
      return t('everyDay');
    case 'timesPerWeek':
      return t('timesPerWeek', { n: descriptor.n });
    case 'noDaysSelected':
      return t('noDaysSelected');
    case 'customDays':
      return descriptor.days.map((d) => weekdayShort(d)).join(', ');
  }
}
