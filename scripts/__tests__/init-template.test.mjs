import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findPlaceholders,
  parseFlags,
  parseGitHubRemote,
  replacePlaceholders,
  shouldSkip,
} from "../init-template.mjs";

describe("replacePlaceholders", () => {
  it("replaces known keys and counts them", () => {
    const { output, counts } = replacePlaceholders("{{A}} and {{A}} and {{B}}", { A: "x", B: "y" });
    assert.equal(output, "x and x and y");
    assert.deepEqual(counts, { A: 2, B: 1 });
  });

  it("leaves unknown or empty-valued keys in place", () => {
    const { output } = replacePlaceholders("{{A}} {{B}} {{C}}", { A: "x", B: "" });
    assert.equal(output, "x {{B}} {{C}}");
  });

  it("never touches GitHub Actions expressions", () => {
    const text = "run: echo ${{ github.ref }} ${{ secrets.TOKEN }}";
    assert.equal(replacePlaceholders(text, { TOKEN: "x", ref: "y" }).output, text);
  });
});

describe("findPlaceholders", () => {
  it("lists uppercase placeholders only", () => {
    assert.deepEqual(findPlaceholders("{{PROJECT_NAME}} {{ nope }} ${{ github.ref }}"), ["PROJECT_NAME"]);
  });
});

describe("parseFlags", () => {
  it("parses --key=value and bare flags", () => {
    assert.deepEqual(parseFlags(["--name=acme", "--dry-run", "positional"]), {
      name: "acme",
      "dry-run": true,
    });
  });
});

describe("parseGitHubRemote", () => {
  it("handles https and ssh remotes", () => {
    assert.deepEqual(parseGitHubRemote("https://github.com/acme/web.git\n"), { owner: "acme", repo: "web" });
    assert.deepEqual(parseGitHubRemote("git@github.com:acme/web"), { owner: "acme", repo: "web" });
    assert.equal(parseGitHubRemote("https://gitlab.com/acme/web.git"), null);
  });
});

describe("shouldSkip", () => {
  it("keeps literal tokens in the setup guide, this script, and all script test fixtures", () => {
    for (const file of [
      "scripts/init-template.mjs",
      "TEMPLATE_SETUP.md",
      "scripts/__tests__/check-doc-links.test.mjs",
      "scripts/__tests__/init-template.test.mjs",
    ]) {
      assert.ok(shouldSkip(file), file);
    }
  });

  it("still rewrites ordinary files", () => {
    for (const file of ["README.md", "sdd.yaml", "docs/adr/README.md", "scripts/check-sdd-refs.mjs"]) {
      assert.ok(!shouldSkip(file), file);
    }
  });
});
