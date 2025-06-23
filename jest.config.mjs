// Jest configuration for TypeScript and React with ES modules
export default {
  // Tell Jest to use jsdom for browser-like environment
  testEnvironment: 'jsdom',
  
  // Files to ignore in tests
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  
  // Support TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }]
  },
  
  // Files to process with ts-jest
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  
  // Code coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/setupTests.ts'
  ],
  
  // Jest transformers configuration for ESM
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.ts?(x)',
    '**/?(*.)+(spec|test).ts?(x)'
  ]
};

