#!/usr/bin/env node

/**
 * Template initializer (dependency-free).
 *
 * Replaces {{PLACEHOLDER}} tokens across the repository with your project's
 * values, then reports anything left unfilled.
 *
 * Usage:
 *   node scripts/init-template.mjs                         # interactive
 *   node scripts/init-template.mjs --dry-run               # preview only
 *   node scripts/init-template.mjs --name=acme-web --description="…" \
 *     --owner=acme --repo=acme-web --security-contact=security@acme.com \
 *     --contact-email=hello@acme.com --copyright-holder="Acme, Inc."
 *
 * Placeholders: PROJECT_NAME, PROJECT_DESCRIPTION, GITHUB_OWNER, GITHUB_REPO,
 * SECURITY_CONTACT, CONTACT_EMAIL, COPYRIGHT_HOLDER, YEAR (automatic).
 * GitHub Actions expressions such as ${{ github.ref }} are never touched:
 * placeholders are uppercase with no spaces.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const SKIP_DIRS = new Set([".git", "node_modules", ".next", "coverage", "dist", "build", "worktrees"]);
// Files that document or test the placeholders themselves must keep the literal tokens.
const SKIP_FILES = new Set(["scripts/init-template.mjs", "TEMPLATE_SETUP.md"]);
const SKIP_PREFIXES = ["scripts/__tests__/"];
const PLACEHOLDER = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;

export function shouldSkip(relativePath) {
  return SKIP_FILES.has(relativePath) || SKIP_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

export const FIELDS = [
  { key: "PROJECT_NAME", flag: "name", prompt: "Project name (e.g. acme-web)" },
  { key: "PROJECT_DESCRIPTION", flag: "description", prompt: "One-line description" },
  { key: "GITHUB_OWNER", flag: "owner", prompt: "GitHub owner (user or org)" },
  { key: "GITHUB_REPO", flag: "repo", prompt: "GitHub repository name" },
  { key: "SECURITY_CONTACT", flag: "security-contact", prompt: "Security contact email" },
  { key: "CONTACT_EMAIL", flag: "contact-email", prompt: "General contact email" },
  { key: "COPYRIGHT_HOLDER", flag: "copyright-holder", prompt: "Copyright holder" },
];

/** Replace known placeholders; leave unknown ones alone. Returns text and counts. */
export function replacePlaceholders(text, values) {
  const counts = {};
  const output = text.replace(PLACEHOLDER, (whole, key) => {
    if (!(key in values) || values[key] === "") return whole;
    counts[key] = (counts[key] ?? 0) + 1;
    return values[key];
  });
  return { output, counts };
}

export function findPlaceholders(text) {
  return [...text.matchAll(PLACEHOLDER)].map((match) => match[1]);
}

export function parseFlags(argv) {
  const flags = {};
  for (const arg of argv) {
    const match = arg.match(/^--([a-z-]+)(?:=(.*))?$/);
    if (match) flags[match[1]] = match[2] ?? true;
  }
  return flags;
}

export function parseGitHubRemote(url) {
  const match = url.trim().match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/);
  return match ? { owner: match[1], repo: match[2] } : null;
}

function listFiles(root) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) files.push(full);
    }
  };
  walk(root);
  return files;
}

function readText(path) {
  const buffer = readFileSync(path);
  return buffer.includes(0) ? null : buffer.toString("utf8"); // skip binary files
}

function detectRemote(root) {
  try {
    const url = execFileSync("git", ["-C", root, "remote", "get-url", "origin"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return parseGitHubRemote(url);
  } catch {
    return null;
  }
}

async function collectValues(flags, defaults) {
  const values = {};
  const interactive = process.stdin.isTTY && !flags.yes;
  const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null;

  for (const { key, flag, prompt } of FIELDS) {
    let value = typeof flags[flag] === "string" ? flags[flag] : "";
    if (!value && rl) {
      const suggestion = defaults[key] ? ` [${defaults[key]}]` : "";
      value = (await rl.question(`${prompt}${suggestion}: `)).trim() || defaults[key] || "";
    }
    values[key] = value || defaults[key] || "";
  }
  rl?.close();
  values.YEAR = String(new Date().getFullYear());
  return values;
}

async function main() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const flags = parseFlags(process.argv.slice(2));
  const dryRun = Boolean(flags["dry-run"]);

  const remote = detectRemote(root);
  const defaults = {
    GITHUB_OWNER: remote?.owner ?? "",
    GITHUB_REPO: remote?.repo ?? "",
    PROJECT_NAME: remote?.repo ?? "",
    COPYRIGHT_HOLDER: remote?.owner ?? "",
  };
  const values = await collectValues(flags, defaults);
  values.GITHUB_REPO ||= values.PROJECT_NAME;
  values.CONTACT_EMAIL ||= values.SECURITY_CONTACT;
  values.SECURITY_CONTACT ||= values.CONTACT_EMAIL;

  const totals = {};
  const remaining = new Map();
  let changedFiles = 0;

  for (const file of listFiles(root)) {
    const rel = relative(root, file);
    if (shouldSkip(rel)) continue;
    const text = readText(file);
    if (text === null || !text.includes("{{")) continue;

    const { output, counts } = replacePlaceholders(text, values);
    if (output !== text) {
      changedFiles += 1;
      if (!dryRun) writeFileSync(file, output);
      for (const [key, n] of Object.entries(counts)) totals[key] = (totals[key] ?? 0) + n;
    }
    for (const key of findPlaceholders(output)) {
      remaining.set(key, [...(remaining.get(key) ?? []), rel]);
    }
  }

  console.log(`${dryRun ? "[dry run] Would update" : "Updated"} ${changedFiles} file(s).`);
  for (const [key, n] of Object.entries(totals)) console.log(`  ${key}: ${n} replacement(s)`);

  if (remaining.size > 0) {
    console.log("\nPlaceholders still unfilled (provide values and run again):");
    for (const [key, files] of remaining) {
      console.log(`  {{${key}}} in ${[...new Set(files)].slice(0, 3).join(", ")}${files.length > 3 ? ", …" : ""}`);
    }
  } else if (changedFiles === 0) {
    console.log("Nothing to replace. This repository has already been initialized.");
  } else if (!dryRun) {
    console.log("\nNo placeholders left. Next: review TEMPLATE_SETUP.md, then delete it and the README notice.");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
