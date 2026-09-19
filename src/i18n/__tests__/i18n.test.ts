import * as Localization from 'expo-localization';

import {
  RTL_LANGUAGES,
  SUPPORTED_LANGUAGES,
  getDeviceLanguage,
  isRTLLanguage,
  resetLanguageCache,
  t,
  translations,
} from '..';

const getLocales = Localization.getLocales as jest.Mock;

function speak(languageCode: string) {
  resetLanguageCache();
  getLocales.mockReturnValue([{ languageCode }]);
}

beforeEach(() => {
  jest.clearAllMocks();
  speak('en');
});

describe('the locale set', () => {
  it('ships fourteen languages', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(14);
    expect(Object.keys(translations).sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });

  it('defines every English key in every other locale', () => {
    // A missing key is invisible at runtime — t() falls back to English and the
    // screen still renders — so only a check like this catches a locale that
    // quietly stopped being translated.
    const base = Object.keys(translations.en).filter(
      (k) => !/_(?:zero|one|two|few|many|other)$/.test(k),
    );
    for (const lang of SUPPORTED_LANGUAGES) {
      const keys = Object.keys(translations[lang]);
      expect({ lang, missing: base.filter((k) => !keys.includes(k)) }).toEqual({ lang, missing: [] });
    }
  });

  it('mirrors the layout for Arabic and Persian only', () => {
    expect(RTL_LANGUAGES).toEqual(['ar', 'fa']);
  });
});

describe('getDeviceLanguage', () => {
  it('uses a supported device language', () => {
    speak('de');
    expect(getDeviceLanguage()).toBe('de');
  });

  it('falls back to English for a language we do not ship', () => {
    speak('sv');
    expect(getDeviceLanguage()).toBe('en');
  });

  it('falls back to English when the platform throws', () => {
    resetLanguageCache();
    getLocales.mockImplementation(() => {
      throw new Error('no locale service');
    });
    expect(getDeviceLanguage()).toBe('en');
  });

  it('reads the device once and caches it', () => {
    speak('fr');
    getDeviceLanguage();
    getDeviceLanguage();
    expect(getLocales).toHaveBeenCalledTimes(1);
  });
});

describe('isRTLLanguage', () => {
  it.each([
    ['ar', true],
    ['fa', true],
    ['en', false],
    ['el', false],
  ])('reports %s as RTL=%p', (lang, expected) => {
    speak(lang);
    expect(isRTLLanguage()).toBe(expected);
  });
});

describe('t', () => {
  it('returns the string for the active language', () => {
    speak('de');
    expect(t('settingsA11y')).toBe('Einstellungen');
  });

  it('interpolates named parameters', () => {
    expect(t('doneOfTotal', { done: 2, total: 5 })).toBe('2 of 5 done');
  });

  it('leaves an unknown parameter placeholder alone rather than erasing it', () => {
    expect(t('usingAllFreeHabits', { other: 'x' })).toBe('You are using all {n} free habits.');
  });

  it('returns the key itself for a key no locale defines', () => {
    expect(t('nonsenseKey' as never)).toBe('nonsenseKey');
  });

  it('selects the plural CLDR category for a streak count', () => {
    expect(t('streakDays', { count: 1 })).toBe('1 day');
    expect(t('streakDays', { count: 5 })).toBe('5 days');
  });
});
