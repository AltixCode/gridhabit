import {
  missingReleaseConfigFrom,
  RELEASE_ENV_KEYS,
  TEST_AD_UNIT_PREFIX,
} from '../releaseConfig';

const complete = (): Record<string, string> =>
  Object.fromEntries(RELEASE_ENV_KEYS.map((key) => [key, `real-${key}`]));

describe('missingReleaseConfigFrom', () => {
  it('passes a fully configured environment', () => {
    expect(missingReleaseConfigFrom(complete())).toEqual([]);
  });

  it('names every identifier an empty environment is missing', () => {
    expect(missingReleaseConfigFrom({})).toEqual([...RELEASE_ENV_KEYS]);
  });

  it('treats a blank value as missing, because CI passes an unset variable as ""', () => {
    expect(missingReleaseConfigFrom({ ...complete(), ADMOB_IOS_APP_ID: '   ' })).toEqual([
      'ADMOB_IOS_APP_ID',
    ]);
  });

  it('rejects a Google test unit that was left in place', () => {
    // The expensive failure: everything works, ads serve, and the revenue is zero.
    expect(
      missingReleaseConfigFrom({
        ...complete(),
        EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID: `${TEST_AD_UNIT_PREFIX}/6300978111`,
      }),
    ).toEqual(['EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID']);
  });

  it('checks the RevenueCat keys too, since no billing means no ads either', () => {
    const env = complete();
    delete (env as Record<string, string | undefined>).EXPO_PUBLIC_REVENUECAT_IOS_KEY;
    expect(missingReleaseConfigFrom(env)).toEqual(['EXPO_PUBLIC_REVENUECAT_IOS_KEY']);
  });
});
