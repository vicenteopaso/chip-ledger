import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { check, extractLinks, isCheckable, stripCode } from "../check-doc-links.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const tempDirs = [];

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "doc-links-"));
  tempDirs.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

after(() => tempDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe("extractLinks", () => {
  it("finds links and images, with titles", () => {
    const md = '[a](./a.md) ![img](pic.png "t") [b](<b.md#x>)';
    assert.deepEqual(extractLinks(md), ["./a.md", "pic.png", "b.md#x"]);
  });

  it("ignores links in code fences, inline code, and HTML comments", () => {
    const md = "```md\n[x](nope.md)\n```\n`[y](nope2.md)` <!-- [z](nope3.md) --> [real](real.md)";
    assert.deepEqual(extractLinks(md), ["real.md"]);
  });
});

describe("stripCode", () => {
  it("removes fenced blocks", () => {
    assert.equal(stripCode("a\n```\nb\n```\nc").replace(/\n+/g, "|"), "a|c");
  });
});

describe("isCheckable", () => {
  it("skips external, anchor, and placeholder targets", () => {
    assert.equal(isCheckable("https://example.com"), false);
    assert.equal(isCheckable("mailto:a@b.c"), false);
    assert.equal(isCheckable("#section"), false);
    assert.equal(isCheckable("{{PROJECT_NAME}}.md"), false);
    assert.equal(isCheckable("./docs/a.md"), true);
  });
});

describe("check", () => {
  it("passes when targets exist (files, dirs, anchors)", () => {
    const root = fixture({
      "README.md": "[doc](docs/a.md#top) [dir](docs/) [ext](https://x.y)",
      "docs/a.md": "[home](../README.md)",
    });
    assert.deepEqual(check(root), []);
  });

  it("reports broken relative links", () => {
    const root = fixture({ "README.md": "[gone](docs/gone.md)" });
    assert.deepEqual(check(root), ["README.md: broken link -> docs/gone.md"]);
  });
});

describe("this repository", () => {
  it("has no broken relative markdown links", () => {
    assert.deepEqual(check(repoRoot), []);
  });
});
