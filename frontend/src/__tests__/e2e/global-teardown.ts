// import { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests.
 *
 * This teardown runs once after all tests and:
 * - Cleans up test data
 * - Generates test reports
 * - Performs cleanup operations
 */

async function globalTeardown() {
  console.log("🧹 Starting global teardown for FastNext E2E tests...");

  try {
    // Clean up auth files if needed
    await cleanupAuthFiles();

    // Clean up test screenshots and videos if in CI
    await cleanupTestArtifacts();

    // Generate test summary
    await generateTestSummary();

    console.log("✅ Global teardown completed successfully");
  } catch (error) {
    console.error("❌ Global teardown failed:", error);
  }
}

async function cleanupAuthFiles() {
  const fs = await import("fs");
  const path = await import("path");

  try {
    const authDir = path.join(process.cwd(), "tests/e2e/.auth");

    if (fs.existsSync(authDir)) {
      // Keep auth files for local development, clean in CI
      if (process.env.CI) {
        const files = fs.readdirSync(authDir);
        for (const file of files) {
          if (file.endsWith(".json")) {
            fs.unlinkSync(path.join(authDir, file));
          }
        }
        console.log("🗑️  Auth files cleaned up");
      }
    }
  } catch (error) {
    console.log(
      "⚠️  Auth file cleanup skipped:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function cleanupTestArtifacts() {
  if (!process.env.CI) {
    return; // Keep artifacts in local development
  }

  const fs = await import("fs");
  const path = await import("path");

  try {
    // Clean up old screenshots (keep recent ones)
    const testResultsDir = path.join(process.cwd(), "test-results");

    if (fs.existsSync(testResultsDir)) {
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      const cleanupDirectory = (dir: string) => {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);

          if (stat.isDirectory()) {
            cleanupDirectory(itemPath);
          } else if (stat.isFile()) {
            const age = now - stat.mtime.getTime();
            if (age > maxAge) {
              fs.unlinkSync(itemPath);
            }
          }
        }
      };

      cleanupDirectory(testResultsDir);
      console.log("🗑️  Old test artifacts cleaned up");
    }
  } catch (error) {
    console.log(
      "⚠️  Test artifact cleanup skipped:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function generateTestSummary() {
  const fs = await import("fs");
  const path = await import("path");

  try {
    const resultsFile = path.join(process.cwd(), "test-results/results.json");

    if (fs.existsSync(resultsFile)) {
      const results = JSON.parse(fs.readFileSync(resultsFile, "utf8"));

      const summary = {
        totalTests: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        timestamp: new Date().toISOString(),
      };

      console.log("📊 Test Summary:");
      console.log(`   Total: ${summary.totalTests}`);
      console.log(`   Passed: ${summary.passed}`);
      console.log(`   Failed: ${summary.failed}`);
      console.log(`   Skipped: ${summary.skipped}`);
      console.log(`   Duration: ${(summary.duration / 1000).toFixed(2)}s`);

      // Save summary for CI
      if (process.env.CI) {
        const summaryFile = path.join(
          process.cwd(),
          "test-results/summary.json",
        );
        fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
      }
    }
  } catch (error) {
    console.log(
      "⚠️  Test summary generation skipped:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export default globalTeardown;
