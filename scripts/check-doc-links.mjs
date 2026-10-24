#!/usr/bin/env node

/**
 * Markdown link checker (dependency-free).
 *
 * Verifies that relative links and images in markdown files point at files or
 * directories that exist. External URLs, mailto links, and in-page anchors are
 * ignored. Links inside HTML comments, code fences, and inline code are ignored,
 * as are targets containing template placeholders such as {{PROJECT_NAME}}.
 *
 * Usage: node scripts/check-doc-links.mjs [--root <dir>]
 * Exit:  0 ok, 1 broken links found
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
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

/** Remove HTML comments, fenced code blocks, and inline code so sample links are not checked. */
export function stripCode(markdown) {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, "")
    .replace(/`[^`\n]*`/g, "");
}

/** Return link targets from `[text](target)` and `![alt](target)`. */
export function extractLinks(markdown) {
  const links = [];
  const pattern = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
  for (const match of stripCode(markdown).matchAll(pattern)) {
    links.push(match[1]);
  }
  return links;
}

export function isCheckable(target) {
  if (target.startsWith("#")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return false; // http:, https:, mailto:, etc.
  if (target.includes("{{")) return false;
  return true;
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
  for (const file of walkMarkdown(root)) {
    const text = readFileSync(file, "utf8");
    for (const target of extractLinks(text)) {
      if (!isCheckable(target)) continue;
      const pathPart = decodeURIComponent(target.split("#")[0].split("?")[0]);
      if (pathPart === "") continue;
      const resolved = pathPart.startsWith("/")
        ? join(root, pathPart)
        : resolve(dirname(file), pathPart);
      if (!existsSync(resolved)) {
        problems.push(`${relative(root, file)}: broken link -> ${target}`);
      }
    }
  }
  return problems;
}

function main() {
  const rootArg = process.argv.indexOf("--root");
  const root = resolve(
    rootArg !== -1 ? process.argv[rootArg + 1] : fileURLToPath(new URL("..", import.meta.url)),
  );
  const problems = check(root);
  if (problems.length > 0) {
    console.error("Markdown link check failed:\n");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error(`\n${problems.length} broken link(s).`);
    process.exit(1);
  }
  console.log("All relative markdown links resolve.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
