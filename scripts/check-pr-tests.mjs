#!/usr/bin/env node

/**
 * Test-change check (AI guardrail, dependency-free).
 *
 * Fails when a PR changes source files under CODE_PATHS without changing any
 * test file. Documentation, config, styles, and JSON changes never trigger it.
 *
 * A file counts as a test when it lives under a test directory (test/, tests/,
 * __tests__/, e2e/) or is named *.test.* / *.spec.*, so both separate-tree and
 * colocated layouts work.
 *
 * Keep CODE_PATHS in sync with the layer paths in sdd.yaml
 * (standards.architecture.layers).
 *
 * Environment:
 *   GITHUB_BASE_REF  Base branch to diff against (default: main)
 *   CODE_PATHS       Comma-separated path prefixes (default: app/,lib/,src/)
 *   SKIP_TEST_CHECK  "true" to skip. Emergency use only; justify it in the PR.
 *
 * Exit: 0 ok, 1 code changed without tests
 */

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const SOURCE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const TEST_DIR = /(^|\/)(test|tests|__tests__|e2e)\//;

export function isTestFile(file) {
  return TEST_FILE.test(file) || TEST_DIR.test(file);
}

export function isSourceFile(file, codePaths) {
  return (
    codePaths.some((prefix) => file.startsWith(prefix)) &&
    SOURCE_EXTENSIONS.test(file) &&
    !file.endsWith(".d.ts") &&
    !isTestFile(file)
  );
}

export function evaluate(changedFiles, codePaths) {
  const source = changedFiles.filter((file) => isSourceFile(file, codePaths));
  const tests = changedFiles.filter(isTestFile);
  if (source.length === 0) {
    return { passed: true, source, tests, reason: "No source changes under monitored paths." };
  }
  if (tests.length > 0) {
    return { passed: true, source, tests, reason: `${tests.length} test file(s) changed.` };
  }
  return {
    passed: false,
    source,
    tests,
    reason: "Source files changed without any test changes.",
  };
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function changedFiles(baseRef) {
  const output = process.env.CI
    ? git(["diff", "--name-only", `origin/${baseRef}...HEAD`])
    : git(["diff", "--name-only", "HEAD"]) || git(["diff", "--name-only", `${baseRef}...HEAD`]);
  return output ? output.split("\n").filter(Boolean) : [];
}

function main() {
  if (process.env.SKIP_TEST_CHECK === "true") {
    console.log("Test check skipped (SKIP_TEST_CHECK=true). Justify this in the PR description.");
    return;
  }

  const baseRef = process.env.GITHUB_BASE_REF || "main";
  const codePaths = (process.env.CODE_PATHS || "app/,lib/,src/")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let files;
  try {
    files = changedFiles(baseRef);
  } catch (error) {
    // Failing open on a git error would silently disable the guardrail in CI.
    console.error(`Could not determine changed files: ${error.message}`);
    process.exit(process.env.CI ? 1 : 0);
  }

  const result = evaluate(files, codePaths);
  console.log(result.reason);
  for (const file of result.source) console.log(`  source: ${file}`);
  for (const file of result.tests) console.log(`  test:   ${file}`);

  if (!result.passed) {
    console.error(
      "\nBehavior changes need tests, and bug fixes need a regression test (CONSTITUTION-13).\n" +
        "Add or update tests, or, for a pure refactor with no behavior change, set SKIP_TEST_CHECK=true\n" +
        "and explain why in the PR description. See docs/TESTING.md.",
    );
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
