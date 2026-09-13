module.exports = {
  preset: 'jest-expo',
  // Reanimated 4 runs on react-native-worklets, whose `.native.ts` entry points
  // reach for the JSI. This resolver picks the non-native build under Jest.
  resolver: 'react-native-worklets/jest/resolver.js',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-purchases|react-native-google-mobile-ads)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: { branches: 70, functions: 70, lines: 75, statements: 75 },
  },
};
