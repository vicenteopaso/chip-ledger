import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  check,
  extractPaths,
  parseEnforcement,
  parseInvariants,
  parseRequiredChecks,
} from "../check-sdd-refs.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const tempDirs = [];

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "sdd-refs-"));
  tempDirs.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

after(() => tempDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const constitution = "CONSTITUTION-01: First.\nCONSTITUTION-02: Second. [RETIRED]\n";
const sdd = `constitution:
  enforcement:
    CONSTITUTION-01: [review, ci:verify]
devex:
  ci:
    required-checks:
      - verify # runs things
      - lint
    other: x
`;

describe("parsers", () => {
  it("parseInvariants reads IDs and retired flags", () => {
    assert.deepEqual(parseInvariants(constitution), [
      { id: "CONSTITUTION-01", retired: false },
      { id: "CONSTITUTION-02", retired: true },
    ]);
  });

  it("parseEnforcement reads the map", () => {
    assert.deepEqual([...parseEnforcement(sdd)], [["CONSTITUTION-01", ["review", "ci:verify"]]]);
  });

  it("parseRequiredChecks stops at the end of the list and ignores comments", () => {
    assert.deepEqual(parseRequiredChecks(sdd), ["verify", "lint"]);
  });

  it("extractPaths finds repo paths (comments included) and strips trailing punctuation", () => {
    const paths = extractPaths(
      'see "docs/adr/0000-adr-template.md." and ./scripts/a.mjs, # also docs/in-comment.md',
    );
    assert.deepEqual(paths.sort(), [
      "docs/adr/0000-adr-template.md",
      "docs/in-comment.md",
      "scripts/a.mjs",
    ]);
  });
});

describe("check", () => {
  it("passes a consistent fixture (retired invariants need no enforcement)", () => {
    const root = fixture({ "docs/CONSTITUTION.md": constitution, "sdd.yaml": sdd });
    assert.deepEqual(check(root), []);
  });

  it("reports an invariant without enforcement", () => {
    const root = fixture({
      "docs/CONSTITUTION.md": constitution + "CONSTITUTION-03: Third.\n",
      "sdd.yaml": sdd,
    });
    assert.match(check(root).join("\n"), /CONSTITUTION-03 has no entry/);
  });

  it("reports enforcement for an unknown invariant and an unknown ci check", () => {
    const bad = sdd.replace("[review, ci:verify]", "[review, ci:nope]") + "";
    const root = fixture({
      "docs/CONSTITUTION.md": constitution,
      "sdd.yaml": bad.replace("    CONSTITUTION-01:", "    CONSTITUTION-09: [review]\n    CONSTITUTION-01:"),
    });
    const text = check(root).join("\n");
    assert.match(text, /CONSTITUTION-09 is not defined/);
    assert.match(text, /ci:nope/);
  });

  it("reports references to missing files and unknown IDs in markdown", () => {
    const root = fixture({
      "docs/CONSTITUTION.md": constitution,
      "sdd.yaml": sdd + "x: docs/missing.md\n",
      "README.md": "See CONSTITUTION-42 and FP-07.\n",
    });
    const text = check(root).join("\n");
    assert.match(text, /docs\/missing\.md/);
    assert.match(text, /unknown CONSTITUTION-42/);
    assert.match(text, /unknown FP-07/);
  });
});

describe("this repository", () => {
  it("has consistent governance artifacts", () => {
    assert.deepEqual(check(repoRoot), []);
  });
});
