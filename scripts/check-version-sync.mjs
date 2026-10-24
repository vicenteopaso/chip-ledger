#!/usr/bin/env node

/**
 * Version sync check (optional, dependency-free).
 *
 * Ensures the version in package.json, the newest released entry in
 * CHANGELOG.md, and (on tag builds) the git tag all agree.
 * Skips quietly when there is no package.json yet.
 *
 * Usage: node scripts/check-version-sync.mjs [--fix-from-changelog]
 *   --fix-from-changelog  rewrite package.json's version from the changelog
 *
 * Exit: 0 ok, 1 mismatch
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

/** First released heading: `## [1.2.3]` or `## [1.2.3] - date`. Skips [Unreleased]. */
export function changelogVersion(changelog) {
  const match = changelog.match(/^## \[(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\]/m);
  return match ? match[1] : null;
}

export function tagVersion(ref, describe) {
  const tag = ref && ref.startsWith("refs/tags/") ? ref.slice("refs/tags/".length) : describe();
  return tag.startsWith("v") ? tag.slice(1) : tag;
}

function main() {
  const pkgPath = `${root}package.json`;
  if (!existsSync(pkgPath)) {
    console.log("No package.json yet; nothing to check.");
    return;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const fromChangelog = changelogVersion(readFileSync(`${root}CHANGELOG.md`, "utf8"));
  if (!fromChangelog) {
    console.error('CHANGELOG.md has no released version heading like "## [1.2.3]".');
    process.exit(1);
  }

  if (process.argv.includes("--fix-from-changelog")) {
    if (pkg.version !== fromChangelog) {
      pkg.version = fromChangelog;
      writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
      console.log(`Set package.json version to ${fromChangelog} from CHANGELOG.md.`);
    } else {
      console.log(`package.json already at ${fromChangelog}.`);
    }
    return;
  }

  const mismatches = [];
  if (pkg.version !== fromChangelog) {
    mismatches.push(`package.json=${pkg.version} but CHANGELOG.md=${fromChangelog}`);
  }

  if (process.env.GITHUB_REF?.startsWith("refs/tags/")) {
    const tag = tagVersion(process.env.GITHUB_REF, () =>
      execFileSync("git", ["describe", "--tags", "--abbrev=0"], { encoding: "utf8" }).trim(),
    );
    if (pkg.version !== tag) mismatches.push(`package.json=${pkg.version} but tag=${tag}`);
  }

  if (mismatches.length > 0) {
    console.error(`Version mismatch: ${mismatches.join("; ")}`);
    process.exit(1);
  }
  console.log(`Versions in sync at ${pkg.version}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
