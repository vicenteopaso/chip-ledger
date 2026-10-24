#!/usr/bin/env node

/**
 * SDD traceability check (dependency-free).
 *
 * Verifies that the governance artifacts agree with each other:
 *  1. Every active CONSTITUTION-NN invariant has an entry in sdd.yaml under
 *     constitution.enforcement, and no entry points at an unknown invariant.
 *  2. Every `ci:<id>` enforcement reference names a job listed in
 *     devex.ci.required-checks.
 *  3. Every CONSTITUTION-NN mentioned anywhere in markdown exists.
 *  4. Every FP-NN mentioned anywhere in markdown exists in FORBIDDEN_PATTERNS.md.
 *  5. File paths under docs/, scripts/, .github/ and .claude/ mentioned in
 *     sdd.yaml exist.
 *
 * Schema validation of sdd.yaml is done separately by ajv in CI.
 *
 * Usage: node scripts/check-sdd-refs.mjs [--root <dir>]
 * Exit:  0 ok, 1 problems found
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "coverage",
  "dist",
  "build",
  "worktrees",
]);

/** Parse invariant lines like `CONSTITUTION-07: text` (column 0). */
export function parseInvariants(constitution) {
  const invariants = [];
  for (const line of constitution.split("\n")) {
    const match = line.match(/^CONSTITUTION-(\d{2}):\s*(.*)$/);
    if (match) {
      invariants.push({
        id: `CONSTITUTION-${match[1]}`,
        retired: /\[RETIRED\]/i.test(match[2]),
      });
    }
  }
  return invariants;
}

/** Parse the enforcement map: `    CONSTITUTION-01: [review, ci:foo]`. */
export function parseEnforcement(sddText) {
  const map = new Map();
  for (const line of sddText.split("\n")) {
    const match = line.match(/^\s+(CONSTITUTION-[A-Z0-9-]+):\s*\[(.*?)\]/);
    if (match) {
      const items = match[2]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      map.set(match[1], items);
    }
  }
  return map;
}

/** Parse the `required-checks:` list, ignoring trailing `# comments`. */
export function parseRequiredChecks(sddText) {
  const lines = sddText.split("\n");
  const start = lines.findIndex((l) => /^\s+required-checks:\s*$/.test(l));
  if (start === -1) return [];
  const indent = lines[start].match(/^\s*/)[0].length;
  const checks = [];
  for (const line of lines.slice(start + 1)) {
    const item = line.match(/^\s+-\s+([A-Za-z0-9_-]+)/);
    const currentIndent = line.match(/^\s*/)[0].length;
    if (item && currentIndent > indent) {
      checks.push(item[1]);
    } else if (line.trim() !== "" && currentIndent <= indent) {
      break;
    }
  }
  return checks;
}

/** Extract repo-relative paths worth verifying from sdd.yaml text. */
export function extractPaths(sddText) {
  const paths = new Set();
  const pattern = /(?:\.\/)?((?:docs|scripts|\.github|\.claude)\/[A-Za-z0-9_./-]*[A-Za-z0-9_/])/g;
  for (const line of sddText.split("\n")) {
    const code = line.replace(/^\s*#.*$/, "");
    for (const match of code.matchAll(pattern)) {
      if (!match[1].includes("{{")) paths.add(match[1]);
    }
  }
  return [...paths];
}

function walkMarkdown(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdown(full, files);
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(full);
  }
  return files;
}

export function check(root) {
  const problems = [];
  const read = (rel) => readFileSync(join(root, rel), "utf8");

  const constitutionPath = "docs/CONSTITUTION.md";
  const sddPath = "sdd.yaml";
  for (const required of [constitutionPath, sddPath]) {
    if (!existsSync(join(root, required))) {
      problems.push(`Missing required file: ${required}`);
    }
  }
  if (problems.length > 0) return problems;

  const constitution = read(constitutionPath);
  const sdd = read(sddPath);

  const invariants = parseInvariants(constitution);
  const known = new Set(invariants.map((i) => i.id));
  const seen = new Set();
  for (const { id } of invariants) {
    if (seen.has(id)) problems.push(`${constitutionPath}: duplicate invariant ${id}`);
    seen.add(id);
  }
  if (invariants.length === 0) {
    problems.push(`${constitutionPath}: no invariants found (expected lines like "CONSTITUTION-01: …")`);
  }

  const enforcement = parseEnforcement(sdd);
  const requiredChecks = new Set(parseRequiredChecks(sdd));

  for (const { id, retired } of invariants) {
    if (!retired && !enforcement.has(id)) {
      problems.push(`${sddPath}: ${id} has no entry under constitution.enforcement`);
    }
  }
  for (const [id, items] of enforcement) {
    if (!known.has(id) && !id.startsWith("CONSTITUTION-OPT-")) {
      problems.push(`${sddPath}: enforcement entry ${id} is not defined in ${constitutionPath}`);
    }
    for (const item of items) {
      if (item.startsWith("ci:") && !requiredChecks.has(item.slice(3))) {
        problems.push(
          `${sddPath}: ${id} references ${item}, which is not in devex.ci.required-checks`,
        );
      }
    }
  }

  for (const path of extractPaths(sdd)) {
    if (!existsSync(join(root, path))) {
      problems.push(`${sddPath}: referenced path does not exist: ${path}`);
    }
  }

  const fpPath = "docs/FORBIDDEN_PATTERNS.md";
  const fpIds = existsSync(join(root, fpPath))
    ? new Set([...read(fpPath).matchAll(/^###\s+(FP-\d{2})\b/gm)].map((m) => m[1]))
    : new Set();

  for (const file of walkMarkdown(root)) {
    const rel = relative(root, file);
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/\bCONSTITUTION-(\d{2})\b/g)) {
      const id = `CONSTITUTION-${match[1]}`;
      if (!known.has(id)) problems.push(`${rel}: references unknown ${id}`);
    }
    for (const match of text.matchAll(/\bFP-(\d{2})\b/g)) {
      const id = `FP-${match[1]}`;
      if (!fpIds.has(id)) problems.push(`${rel}: references unknown ${id}`);
    }
  }

  return [...new Set(problems)];
}

function main() {
  const rootArg = process.argv.indexOf("--root");
  const root = resolve(
    rootArg !== -1 ? process.argv[rootArg + 1] : fileURLToPath(new URL("..", import.meta.url)),
  );
  const problems = check(root);
  if (problems.length > 0) {
    console.error("SDD reference check failed:\n");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error(`\n${problems.length} problem(s).`);
    process.exit(1);
  }
  console.log("SDD reference check passed.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
