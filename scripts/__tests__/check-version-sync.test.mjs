import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { changelogVersion, tagVersion } from "../check-version-sync.mjs";

describe("changelogVersion", () => {
  it("returns the first released version and skips [Unreleased]", () => {
    const md = "# Changelog\n\n## [Unreleased]\n\n## [1.4.0] - 2026-01-02\n\n## [1.3.9]\n";
    assert.equal(changelogVersion(md), "1.4.0");
  });

  it("supports prerelease versions and returns null when none", () => {
    assert.equal(changelogVersion("## [2.0.0-rc.1]\n"), "2.0.0-rc.1");
    assert.equal(changelogVersion("## [Unreleased]\n"), null);
  });
});

describe("tagVersion", () => {
  it("strips the ref prefix and leading v", () => {
    assert.equal(tagVersion("refs/tags/v1.2.3", () => "unused"), "1.2.3");
  });

  it("falls back to git describe", () => {
    assert.equal(tagVersion(undefined, () => "v0.9.0"), "0.9.0");
  });
});
