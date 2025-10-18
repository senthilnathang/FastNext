import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Testing Configuration for FastNext Framework
 *
 * This configuration provides comprehensive end-to-end testing setup with:
 * - Multiple browser support (Chrome, Firefox, Safari)
 * - Mobile device testing
 * - API testing capabilities
 * - Screenshot and video recording on failures
 * - Parallel test execution
 */

export default defineConfig({
  // Test directory
  testDir: "./src/__tests__/e2e",

  // Test file patterns
  testMatch: ["**/*.{test,spec}.{js,ts}", "**/e2e/**/*.{test,spec}.{js,ts}"],

  // Global timeout for each test
  timeout: 30 * 1000,

  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: process.env.CI
    ? [
        ["html", { outputFolder: "playwright-report" }],
        ["json", { outputFile: "test-results/results.json" }],
        ["junit", { outputFile: "test-results/results.xml" }],
        ["github"],
      ]
    : [
        ["html", { outputFolder: "playwright-report" }],
        ["json", { outputFile: "test-results/results.json" }],
        ["junit", { outputFile: "test-results/results.xml" }],
        ["list"],
      ],

  // Global setup/teardown
  globalSetup: require.resolve("./src/__tests__/e2e/global-setup.ts"),
  globalTeardown: require.resolve("./src/__tests__/e2e/global-teardown.ts"),

  // Shared settings for all the projects below
  use: {
    // Base URL for the application
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

    // API base URL for API testing
    extraHTTPHeaders: {
      // Add any default headers here
    },

    // Collect trace on failure
    trace: "on-first-retry",

    // Take screenshot on failure
    screenshot: "only-on-failure",

    // Record video on failure
    video: "retain-on-failure",

    // Timeout for actions like click, fill, etc.
    actionTimeout: 10000,

    // Timeout for navigation actions
    navigationTimeout: 10000,
  },

  // Configure projects for major browsers
  projects: [
    // Setup project to authenticate users
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    // Desktop Chrome
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use prepared auth state
        storageState: "src/__tests__/e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    // Desktop Firefox
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: "src/__tests__/e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    // Desktop Safari
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        storageState: "src/__tests__/e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    // Mobile Chrome
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
        storageState: "src/__tests__/e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    // Mobile Safari
    {
      name: "Mobile Safari",
      use: {
        ...devices["iPhone 12"],
        storageState: "src/__tests__/e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    // Admin user tests
    {
      name: "admin-chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "src/__tests__/e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
      testMatch: "**/admin/**/*.{test,spec}.{js,ts}",
    },

    // API testing project
    {
      name: "api",
      testMatch: "**/api/**/*.{test,spec}.{js,ts}",
      use: {
        baseURL: process.env.PLAYWRIGHT_API_BASE_URL || "http://localhost:8000",
      },
    },
  ],

  // Development server configuration
  webServer: [
    // Frontend server
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        NODE_ENV: "development",
      },
    },
    // Backend server (if needed)
    {
      command: "cd ../backend && python main.py",
      url: "http://localhost:8000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        ENVIRONMENT: "test",
      },
    },
  ],

  // Output directories
  outputDir: "test-results/",

  // Global test timeout
  globalTimeout: process.env.CI ? 10 * 60 * 1000 : undefined,
});
