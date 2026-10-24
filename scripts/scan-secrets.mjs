#!/usr/bin/env node

/**
 * Secrets scanner (lightweight, dependency-free).
 *
 * A fast safety net against accidentally committed credentials. It does NOT
 * replace platform secret scanning / push protection or a history scanner such
 * as gitleaks; it catches the obvious cases in pre-commit and CI.
 *
 * Usage:
 *   node scripts/scan-secrets.mjs                    # all tracked files
 *   node scripts/scan-secrets.mjs --changed          # staged + unstaged changes
 *   node scripts/scan-secrets.mjs file1.js file2.ts  # specific files
 *
 * Exit: 0 clean, 1 potential secrets found
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Backreferences (\1) make opening and closing quotes match.
export const SECRET_PATTERNS = [
  {
    pattern:
      /(['"`])(?:api[_-]?key|apikey|api[_-]?secret)\1\s*[:=]\s*['"`][a-zA-Z0-9_-]{20,}['"`]/gi,
    description: "API key assignment",
  },
  {
    pattern: /(['"`])(?:secret|password|passwd|pwd)\1\s*[:=]\s*['"`][^\s'"`]{8,}['"`]/gi,
    description: "Password/secret assignment",
  },
  { pattern: /(['"`])Bearer\s+[a-zA-Z0-9_.-]{20,}['"`]/g, description: "Bearer token" },
  { pattern: /\bgh[pousr]_[a-zA-Z0-9]{36,}\b/g, description: "GitHub token" },
  { pattern: /\bgithub_pat_[a-zA-Z0-9_]{50,}\b/g, description: "GitHub fine-grained token" },
  { pattern: /\bsk-[a-zA-Z0-9_-]{20,}\b/g, description: "Secret key (sk-…)" },
  { pattern: /\bsk_live_[0-9a-zA-Z]{24,}\b/g, description: "Stripe live secret key" },
  { pattern: /\bAKIA[0-9A-Z]{16}\b/g, description: "AWS access key ID" },
  { pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g, description: "Google API key" },
  { pattern: /\bxox[baprs]-[0-9a-zA-Z-]{10,}\b/g, description: "Slack token" },
  {
    pattern: /(['"`])[a-f0-9]{128,}\1/gi,
    description: "Very long hexadecimal string (potential secret)",
  },
  {
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/g,
    description: "Private key",
  },
];

// Path fragments never scanned.
const IGNORE_PATTERNS = [
  ".env.example",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  ".git/",
  "node_modules/",
  ".next/",
  "coverage/",
  "dist/",
  "build/",
  ".turbo/",
  "scripts/scan-secrets.mjs", // contains the patterns themselves
  "scripts/__tests__/", // fixtures deliberately resemble secrets
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
];

// Exact placeholder strings that are safe to leave in docs and fixtures.
const ALLOWLIST = [
  "your-api-key-here",
  "your_api_key",
  "INSERT_API_KEY_HERE",
  "REPLACE_WITH_YOUR_KEY",
  "test-secret-key",
  "mock-api-key",
  "fake-token-12345",
];

export function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some((fragment) => filePath.includes(fragment));
}

export function isAllowlisted(text) {
  const lower = text.toLowerCase();
  return ALLOWLIST.some((allowed) => lower.includes(allowed.toLowerCase()));
}

/** Scan text and return findings with 1-based line numbers. */
export function scanText(content, filePath = "<input>") {
  const findings = [];
  const lines = content.split("\n");
  for (const { pattern, description } of SECRET_PATTERNS) {
    for (const match of content.matchAll(new RegExp(pattern.source, pattern.flags))) {
      if (isAllowlisted(match[0])) continue;
      const line = content.slice(0, match.index).split("\n").length;
      findings.push({
        file: filePath,
        line,
        pattern: description,
        context: (lines[line - 1] ?? "").trim().slice(0, 100),
      });
    }
  }
  return findings;
}

function scanFile(filePath) {
  try {
    if (!existsSync(filePath) || !statSync(filePath).isFile() || shouldIgnoreFile(filePath)) {
      return [];
    }
    return scanText(readFileSync(filePath, "utf8"), filePath);
  } catch (error) {
    console.error(`Error scanning ${filePath}: ${error.message}`);
    return [];
  }
}

function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return null; // not a repo, no HEAD yet, or shallow history
  }
}

function filesToScan(args) {
  const explicit = args.filter((arg) => !arg.startsWith("--"));
  if (explicit.length > 0) return explicit;

  if (args.includes("--changed")) {
    const staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]) ?? [];
    const unstaged =
      git(["diff", "--name-only", "--diff-filter=ACMR", "HEAD"]) ??
      git(["diff", "--name-only", "--diff-filter=ACMR", "HEAD~1", "HEAD"]) ??
      [];
    const untracked = git(["ls-files", "--others", "--exclude-standard"]) ?? [];
    return [...new Set([...staged, ...unstaged, ...untracked])];
  }

  const tracked = git(["ls-files"]);
  if (tracked === null) {
    // Failing open here would report "clean" for a scan that never ran.
    console.error("Cannot list tracked files (not a git repository?). Pass file paths explicitly.");
    process.exit(1);
  }
  return tracked;
}

function main() {
  const files = filesToScan(process.argv.slice(2));
  if (files.length === 0) {
    console.log("No files to scan.");
    return;
  }

  console.log(`Scanning ${files.length} file(s) for potential secrets…`);
  const findings = files.flatMap(scanFile);

  if (findings.length === 0) {
    console.log("No potential secrets detected.");
    return;
  }

  console.error("\nPotential secrets detected:\n");
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  ${f.pattern}\n    ${f.context}`);
  }
  console.error(
    `\n${findings.length} potential secret(s). If real: revoke and rotate NOW, then remove from history.\n` +
      "If a false positive: use a placeholder such as 'your-api-key-here', or add an exact string to ALLOWLIST.",
  );
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
