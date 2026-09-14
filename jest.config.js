module.exports = {
  preset: 'jest-expo',
  // Reanimated 4 runs on react-native-worklets, whose `.native.ts` entry points
  // reach for the JSI. This resolver picks the non-native build under Jest.
  resolver: 'react-native-worklets/jest/resolver.js',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // The first render in a suite pays for Babel-transforming React Native and
  // the icon font. On a cold cache — which is every CI run — that can exceed
  // Jest's 5s default and fail a test that is not actually slow.
  testTimeout: 30_000,
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-purchases|react-native-google-mobile-ads)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    // Screens too: the render-loop bug that crashed the Today screen lived
    // here, and went unmeasured because this directory was not collected.
    'app/**/*.tsx',
    '!app/_layout.tsx',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    // Barrel files re-export only; there is nothing to cover.
    '!src/**/index.ts',
    // Thin adapters over native SDKs with no branching logic of our own.
    // Their behaviour is verified by manual QA on device (see docs/RELEASE.md),
    // not by asserting against a mock of the SDK we are wrapping.
    '!src/monetization/ads.ts',
    '!src/notifications/reminders.ts',
    '!src/db/database.ts',
    '!src/dev/seedDatabase.ts',
  ],
  coverageThreshold: {
    global: { branches: 82, functions: 88, lines: 90, statements: 88 },
  },
};
