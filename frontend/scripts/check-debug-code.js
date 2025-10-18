#!/usr/bin/env node
/**
 * Check for debug code in staged files
 * Prevents console.log, debugger, and other debug statements from being committed
 */

import { execSync } from "child_process";

const DEBUG_PATTERNS = [
  {
    pattern: /console\.(log|debug|info|warn)\(/g,
    name: "console.log/debug/info/warn",
  },
  { pattern: /debugger;/g, name: "debugger statement" },
  { pattern: /\.only\(/g, name: "test.only or describe.only" },
  { pattern: /\.skip\(/g, name: "test.skip or describe.skip" },
];

const ALLOWED_FILES = [
  /\.test\.(ts|tsx|js|jsx)$/, // Test files
  /\.spec\.(ts|tsx|js|jsx)$/, // Spec files
  /\.stories\.(ts|tsx|js|jsx)$/, // Storybook files
  /scripts\//, // Script files
  /\.config\.(ts|js)$/, // Config files
];

function checkFile(filePath, content) {
  const issues = [];

  // Skip allowed files
  if (ALLOWED_FILES.some((pattern) => pattern.test(filePath))) {
    return issues;
  }

  // Check for debug patterns
  DEBUG_PATTERNS.forEach(({ pattern, name }) => {
    const matches = content.match(pattern);
    if (matches) {
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          issues.push({
            file: filePath,
            line: index + 1,
            pattern: name,
            code: line.trim(),
          });
        }
      });
    }
  });

  return issues;
}

function main() {
  try {
    // Get staged files
    const stagedFiles = execSync(
      "git diff --cached --name-only --diff-filter=ACM",
      {
        encoding: "utf8",
      },
    )
      .split("\n")
      .filter((file) => file.match(/\.(ts|tsx|js|jsx)$/));

    if (stagedFiles.length === 0) {
      process.exit(0);
    }

    let allIssues = [];

    stagedFiles.forEach((file) => {
      try {
        const content = execSync(`git show :${file}`, { encoding: "utf8" });
        const issues = checkFile(file, content);
        allIssues = allIssues.concat(issues);
      } catch {
        // File might be deleted or binary, skip
      }
    });

    if (allIssues.length > 0) {
      console.error("\n❌ Debug code detected in staged files:\n");

      allIssues.forEach((issue) => {
        console.error(`  ${issue.file}:${issue.line}`);
        console.error(`    ${issue.pattern}: ${issue.code}`);
        console.error("");
      });

      console.error("🚫 Please remove debug code before committing.\n");
      console.error(
        "💡 Tip: Use a proper logging library in production code.\n",
      );

      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error checking debug code:", error.message);
    process.exit(1);
  }
}

main();
