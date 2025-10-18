import nextJest from "next/jest.js";

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
  transformIgnorePatterns: ["node_modules/(?!(nuqs|@tanstack|@hookform)/)"],
  // Exclude E2E tests from Jest (they should be run with Playwright)
  testPathIgnorePatterns: ["<rootDir>/src/__tests__/e2e/"],
};

export default createJestConfig(customJestConfig);
