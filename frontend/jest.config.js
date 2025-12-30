const nextJest = require("next/jest.js");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Transform ES modules in node_modules for packages that need it
  transformIgnorePatterns: ["node_modules/(?!(@tanstack|@hookform)/)"],
  // Exclude E2E tests from Jest (they should be run with Playwright)
  testPathIgnorePatterns: [
    "<rootDir>/src/__tests__/e2e/",
    "\\.spec\\.ts$",
    "test-helpers\\.ts$",
    "global-teardown\\.ts$",
    "global-setup\\.ts$",
    "auth\\.setup\\.ts$",
  ],
  // Only run .test.ts and .test.tsx files
  testMatch: [
    "**/__tests__/**/*.test.[jt]s?(x)",
    "**/?(*.)+(test).[jt]s?(x)",
  ],
};

module.exports = createJestConfig(customJestConfig);
