import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/test/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/server/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@test/(.*)$': '<rootDir>/server/tests/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/server/tests/jest.setup.ts'],
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  testPathIgnorePatterns: ['/node_modules/'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  collectCoverageFrom: [
    'server/**/*.{ts,tsx}',
    '!server/tests/**',
    '!**/node_modules/**'
  ]
};

export default config;