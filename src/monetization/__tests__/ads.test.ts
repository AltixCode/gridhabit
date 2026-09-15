/**
 * The ads bootstrap owns two compliance-critical decisions — whether an ad may
 * be requested at all, and in what order the consent prompts appear — so it is
 * tested rather than treated as a thin native adapter.
 */
const mockInitialize = jest.fn().mockResolvedValue([]);
const mockSetRequestConfiguration = jest.fn().mockResolvedValue(undefined);
const mockGatherConsent = jest.fn();
const mockShowPrivacyOptionsForm = jest.fn();

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: () => ({
    initialize: mockInitialize,
    setRequestConfiguration: mockSetRequestConfiguration,
  }),
  AdsConsent: {
    gatherConsent: (...a: unknown[]) => mockGatherConsent(...a),
    showPrivacyOptionsForm: (...a: unknown[]) => mockShowPrivacyOptionsForm(...a),
  },
  AdsConsentDebugGeography: { OTHER: 1, EEA: 2 },
  MaxAdContentRating: { G: 'G' },
}));

const mockRequestTracking = jest.fn().mockResolvedValue({ granted: false });
jest.mock('expo-tracking-transparency', () => ({
  getTrackingPermissionsAsync: jest.fn().mockResolvedValue({ granted: false, canAskAgain: true }),
  requestTrackingPermissionsAsync: (...a: unknown[]) => mockRequestTracking(...a),
}));

const CONSENTED = {
  status: 'OBTAINED',
  canRequestAds: true,
  privacyOptionsRequirementStatus: 'REQUIRED',
};
const REFUSED = {
  status: 'REQUIRED',
  canRequestAds: false,
  privacyOptionsRequirementStatus: 'REQUIRED',
};

/**
 * A fresh copy of the module per test: `initialised` and the cached consent are
 * module-level state, and the whole point of several of these cases is what
 * that state does across calls. `require` rather than `import()` because Jest's
 * CommonJS runtime has no dynamic-import support here.
 */
function loadAds(): typeof import('../ads') {
  let mod!: typeof import('../ads');
  jest.isolateModules(() => {
    // Jest's CommonJS runtime has no dynamic import() here, so require is the
    // only way to get a fresh module instance per test.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../ads') as typeof import('../ads');
  });
  return mod;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGatherConsent.mockResolvedValue(CONSENTED);
  mockShowPrivacyOptionsForm.mockResolvedValue(CONSENTED);
});

describe('initializeAds', () => {
  it('starts the SDK once consent allows it', async () => {
    const ads = loadAds();
    await ads.initializeAds();
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(ads.getConsentSummary().canServeAds).toBe(true);
  });

  it('applies a G content rating and no child-directed treatment', async () => {
    const ads = loadAds();
    await ads.initializeAds();
    expect(mockSetRequestConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({ maxAdContentRating: 'G', tagForChildDirectedTreatment: false }),
    );
  });

  it('never starts the SDK when consent is refused', async () => {
    mockGatherConsent.mockResolvedValue(REFUSED);
    const ads = loadAds();
    await ads.initializeAds();
    expect(mockInitialize).not.toHaveBeenCalled();
    expect(ads.getConsentSummary().canServeAds).toBe(false);
  });

  /**
   * Regression guard. A refusal used to latch `initialised`, so the SDK could
   * never start later in the session even after the user opted in — the banner
   * rendered against an uninitialised SDK and silently never filled.
   *
   * The opt-in is exercised through the privacy options form, which is the only
   * way consent actually changes mid-session. It used to be written as a second
   * `initializeAds` with a different mock, which passed for the wrong reason:
   * it depended on re-presenting the consent form after a refusal, which is
   * behaviour we do not want.
   */
  it('can still start later if consent is granted after a refusal', async () => {
    mockGatherConsent.mockResolvedValue(REFUSED);
    const ads = loadAds();
    await ads.initializeAds();
    expect(mockInitialize).not.toHaveBeenCalled();

    mockShowPrivacyOptionsForm.mockResolvedValue(CONSENTED);
    await ads.showPrivacyOptionsForm();
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('does not start the SDK twice', async () => {
    const ads = loadAds();
    await ads.initializeAds();
    await ads.initializeAds();
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('fails closed and stays usable when the consent flow throws', async () => {
    mockGatherConsent.mockRejectedValue(new Error('no network'));
    const ads = loadAds();
    await expect(ads.initializeAds()).resolves.toBeUndefined();
    expect(mockInitialize).not.toHaveBeenCalled();
    expect(ads.getConsentSummary().canServeAds).toBe(false);
  });

  it('retries after the SDK itself fails to start', async () => {
    mockInitialize.mockRejectedValueOnce(new Error('sdk down'));
    const ads = loadAds();
    await ads.initializeAds();
    await ads.initializeAds();
    expect(mockInitialize).toHaveBeenCalledTimes(2);
  });
});

describe('bootstrapAds', () => {
  // Google's order: establish a legal basis with UMP, then ask the narrower
  // iOS tracking question, then start the SDK.
  it('resolves consent before requesting tracking, and starts the SDK last', async () => {
    const order: string[] = [];
    mockGatherConsent.mockImplementation(async () => {
      order.push('consent');
      return CONSENTED;
    });
    mockRequestTracking.mockImplementation(async () => {
      order.push('att');
      return { granted: true };
    });
    mockInitialize.mockImplementation(async () => {
      order.push('init');
      return [];
    });

    const ads = loadAds();
    await ads.bootstrapAds();
    expect(order).toEqual(['consent', 'att', 'init']);
  });

  it('asks for consent only once across the bootstrap', async () => {
    const ads = loadAds();
    await ads.bootstrapAds();
    expect(mockGatherConsent).toHaveBeenCalledTimes(1);
  });

  /**
   * This asserted the opposite until the bootstrap order was looked at properly.
   * ATT is the narrower question that only arises once UMP consent has
   * established there will be advertising at all: when consent is refused no ad
   * is ever requested, so a tracking prompt asks the user to permit tracking for
   * something that will not happen.
   */
  it('does not ask for tracking when consent is refused, and starts nothing', async () => {
    mockGatherConsent.mockResolvedValue(REFUSED);
    const ads = loadAds();
    await ads.bootstrapAds();
    expect(mockRequestTracking).not.toHaveBeenCalled();
    expect(mockInitialize).not.toHaveBeenCalled();
  });
});

describe('showPrivacyOptionsForm', () => {
  it('republishes consent after the user changes it', async () => {
    mockGatherConsent.mockResolvedValue(REFUSED);
    const ads = loadAds();
    await ads.initializeAds();
    expect(ads.getConsentSummary().canServeAds).toBe(false);

    await ads.showPrivacyOptionsForm();
    expect(ads.getConsentSummary().canServeAds).toBe(true);
  });

  it('starts the SDK when the form is where consent was first granted', async () => {
    mockGatherConsent.mockResolvedValue(REFUSED);
    const ads = loadAds();
    await ads.initializeAds();
    expect(mockInitialize).not.toHaveBeenCalled();

    await ads.showPrivacyOptionsForm();
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('reports failure without throwing', async () => {
    mockShowPrivacyOptionsForm.mockRejectedValue(new Error('dismissed'));
    const ads = loadAds();
    await expect(ads.showPrivacyOptionsForm()).resolves.toBe(false);
  });
});
