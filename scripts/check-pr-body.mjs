#!/usr/bin/env node

/**
 * PR metadata check (dependency-free).
 *
 * - Title must follow Conventional Commits: `type: summary` (optional scope).
 * - Body must contain every `## Heading` from .github/PULL_REQUEST_TEMPLATE.md,
 *   except headings marked "(optional)". Reading the template at run time means
 *   this check cannot drift from it.
 * - At least one box under "Type of Change" must be ticked.
 * - PRs labeled `architecture-change` or `constitution-amendment` must link an ADR.
 *
 * Environment: PR_TITLE, PR_BODY, PR_LABELS (comma-separated)
 * Exit: 0 ok, 1 problems found
 */

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export const TITLE_PATTERN =
  /^(feat|fix|chore|docs|refactor|test|perf|ci)(\([a-z0-9._/-]+\))?!?: \S/;

const ADR_LINK_PATTERN = /docs\/adr\/\d{4}-|ADR-\d{4}/i;
const ADR_REQUIRED_LABELS = ["architecture-change", "constitution-amendment"];

/** Parse `## Heading` lines. `required` is false when the heading says "(optional)". */
export function parseTemplateHeadings(template) {
  return template
    .split("\n")
    .map((line) => line.match(/^##\s+(.+?)\s*$/))
    .filter(Boolean)
    .map((match) => {
      const optional = /\(optional\)\s*$/i.test(match[1]);
      return { title: match[1].replace(/\s*\(optional\)\s*$/i, ""), required: !optional };
    });
}

/** Return the text under a `## Heading` until the next `## ` heading. */
export function sectionBody(body, title) {
  const lines = body.split("\n");
  const start = lines.findIndex((line) => {
    const match = line.match(/^##\s+(.+?)\s*$/);
    return match && match[1].replace(/\s*\(optional\)\s*$/i, "") === title;
  });
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^##\s+/.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

export function validate({ title, body, labels, template }) {
  const problems = [];

  if (!TITLE_PATTERN.test(title)) {
    problems.push(
      `PR title "${title}" must look like "type: summary" with type one of feat, fix, chore, docs, refactor, test, perf, ci.`,
    );
  }

  const missing = parseTemplateHeadings(template)
    .filter((h) => h.required && sectionBody(body, h.title) === null)
    .map((h) => h.title);
  if (missing.length > 0) {
    problems.push(`PR body is missing template sections: ${missing.join("; ")}.`);
  }

  const typeSection = sectionBody(body, "Type of Change");
  if (typeSection !== null && !/^\s*-\s*\[[xX]\]/m.test(typeSection)) {
    problems.push('Tick at least one box under "Type of Change".');
  }

  if (labels.some((label) => ADR_REQUIRED_LABELS.includes(label)) && !ADR_LINK_PATTERN.test(body)) {
    problems.push(
      `PRs labeled ${ADR_REQUIRED_LABELS.map((l) => `"${l}"`).join(" or ")} must link an ADR (for example ADR-0004 or docs/adr/0004-title.md).`,
    );
  }

  return problems;
}

function main() {
  const template = readFileSync(
    fileURLToPath(new URL("../.github/PULL_REQUEST_TEMPLATE.md", import.meta.url)),
    "utf8",
  );
  const problems = validate({
    title: process.env.PR_TITLE ?? "",
    body: process.env.PR_BODY ?? "",
    labels: (process.env.PR_LABELS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    template,
  });
  if (problems.length > 0) {
    console.error("PR check failed:\n");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log("PR title, body, and ADR link look good.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
