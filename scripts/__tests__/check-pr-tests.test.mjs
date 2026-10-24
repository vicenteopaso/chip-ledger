import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluate, isSourceFile, isTestFile } from "../check-pr-tests.mjs";

const codePaths = ["app/", "lib/", "src/"];

describe("isTestFile", () => {
  it("recognizes test directories and colocated test files", () => {
    for (const file of [
      "test/unit/a.test.ts",
      "tests/e2e/flow.ts",
      "lib/__tests__/x.ts",
      "lib/slug.test.ts",
      "app/components/Button.spec.tsx",
    ]) {
      assert.ok(isTestFile(file), file);
    }
  });

  it("does not treat source as tests", () => {
    assert.ok(!isTestFile("lib/slug.ts"));
    assert.ok(!isTestFile("app/testimonials/page.tsx"));
  });
});

describe("isSourceFile", () => {
  it("counts source under monitored paths only", () => {
    assert.ok(isSourceFile("lib/slug.ts", codePaths));
    assert.ok(isSourceFile("app/page.tsx", codePaths));
    assert.ok(!isSourceFile("docs/guide.md", codePaths));
    assert.ok(!isSourceFile("app/styles.css", codePaths));
    assert.ok(!isSourceFile("app/data.json", codePaths));
    assert.ok(!isSourceFile("lib/types.d.ts", codePaths));
    assert.ok(!isSourceFile("lib/slug.test.ts", codePaths));
  });
});

describe("evaluate", () => {
  it("passes docs-only changes", () => {
    assert.equal(evaluate(["docs/a.md", "README.md"], codePaths).passed, true);
  });

  it("fails source changes without tests", () => {
    const result = evaluate(["lib/slug.ts"], codePaths);
    assert.equal(result.passed, false);
    assert.deepEqual(result.source, ["lib/slug.ts"]);
  });

  it("passes source changes with a separate-tree test", () => {
    assert.equal(evaluate(["lib/slug.ts", "test/unit/slug.test.ts"], codePaths).passed, true);
  });

  it("passes source changes with a colocated test", () => {
    assert.equal(evaluate(["lib/slug.ts", "lib/slug.test.ts"], codePaths).passed, true);
  });
});
