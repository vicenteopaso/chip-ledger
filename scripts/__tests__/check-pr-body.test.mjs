import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { parseTemplateHeadings, sectionBody, TITLE_PATTERN, validate } from "../check-pr-body.mjs";

const template = readFileSync(
  new URL("../../.github/PULL_REQUEST_TEMPLATE.md", import.meta.url),
  "utf8",
);

const fullBody = () =>
  template.replace("- [ ] `feat` — new feature or enhancement", "- [x] `feat` — new feature or enhancement");

describe("TITLE_PATTERN", () => {
  it("accepts conventional titles, with scope and breaking marker", () => {
    for (const title of ["feat: add signup", "fix(api): handle 429", "chore!: drop node 20", "ci: pin actions"]) {
      assert.match(title, TITLE_PATTERN);
    }
  });

  it("rejects titles without a type or summary", () => {
    for (const title of ["Add signup", "feat:", "feature: x", "feat add signup", "FEAT: x"]) {
      assert.doesNotMatch(title, TITLE_PATTERN);
    }
  });
});

describe("parseTemplateHeadings", () => {
  it("marks (optional) headings as not required", () => {
    const headings = parseTemplateHeadings("## A\n\n## B (optional)\n");
    assert.deepEqual(headings, [
      { title: "A", required: true },
      { title: "B", required: false },
    ]);
  });

  it("finds every section of the real template", () => {
    const titles = parseTemplateHeadings(template).map((h) => h.title);
    assert.ok(titles.includes("Summary"));
    assert.ok(titles.includes("Type of Change"));
    assert.ok(titles.includes("Architecture Decision Record (ADR)"));
  });
});

describe("sectionBody", () => {
  it("returns the text up to the next heading, or null when absent", () => {
    const body = "## One\nalpha\n## Two\nbeta\n";
    assert.equal(sectionBody(body, "One").trim(), "alpha");
    assert.equal(sectionBody(body, "Missing"), null);
  });
});

describe("validate", () => {
  it("passes an untouched template with a ticked type box", () => {
    assert.deepEqual(validate({ title: "feat: x", body: fullBody(), labels: [], template }), []);
  });

  it("fails when no type of change is ticked", () => {
    const problems = validate({ title: "feat: x", body: template, labels: [], template });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /Type of Change/);
  });

  it("fails when a required section was deleted", () => {
    const body = fullBody().replace("## Risk and Rollback", "## Something else");
    const problems = validate({ title: "feat: x", body, labels: [], template });
    assert.match(problems.join("\n"), /Risk and Rollback/);
  });

  it("allows deleting the optional section", () => {
    const body = fullBody().replace("## Additional Notes (optional)", "## Other");
    assert.deepEqual(validate({ title: "feat: x", body, labels: [], template }), []);
  });

  it("requires an ADR link for architecture-change PRs", () => {
    const labels = ["architecture-change"];
    const without = validate({ title: "feat: x", body: fullBody(), labels, template });
    assert.match(without.join("\n"), /ADR/);

    const withLink = fullBody() + "\nSee ADR-0004.";
    assert.deepEqual(validate({ title: "feat: x", body: withLink, labels, template }), []);
  });

  it("flags a bad title", () => {
    const problems = validate({ title: "Update stuff", body: fullBody(), labels: [], template });
    assert.match(problems[0], /type: summary/);
  });
});
