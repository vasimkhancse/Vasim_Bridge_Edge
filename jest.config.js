module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['./tests/setup.js'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 60000,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/swagger.js',
    '!src/config/db.js',
    '!src/utils/logger.js',
  ],
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },
};
