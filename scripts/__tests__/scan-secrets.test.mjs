import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isAllowlisted, scanText, shouldIgnoreFile } from "../scan-secrets.mjs";

// Fixtures are assembled at runtime so this file never contains a literal secret.
const awsKey = "AKIA" + "ABCDEFGHIJKLMNOP";
const githubToken = "ghp_" + "a".repeat(36);
const pemHeader = "-----BEGIN " + "RSA PRIVATE KEY-----";

describe("scanText", () => {
  it("detects common credential shapes with line numbers", () => {
    const text = `const a = 1;\nconst k = "${awsKey}";\nconst t = "${githubToken}";\n${pemHeader}\n`;
    const findings = scanText(text, "x.js");
    assert.deepEqual(
      findings.map((f) => [f.pattern, f.line]).sort(),
      [
        ["AWS access key ID", 2],
        ["GitHub token", 3],
        ["Private key", 4],
      ],
    );
  });

  it("detects quoted key/value credential assignments", () => {
    const text = `{"password": "hunter2hunter2"}\n{"api_key": "${"x".repeat(24)}"}`;
    assert.equal(scanText(text).length, 2);
  });

  it("ignores ordinary code and placeholder values", () => {
    const text = `const apiKey = process.env.API_KEY;\n"api_key": "your-api-key-here-xxxxxxxxxxxx"\n`;
    assert.deepEqual(scanText(text), []);
  });
});

describe("helpers", () => {
  it("ignores lockfiles, build output, and the scanner itself", () => {
    for (const file of ["pnpm-lock.yaml", "node_modules/x/y.js", "scripts/scan-secrets.mjs", ".env.example"]) {
      assert.ok(shouldIgnoreFile(file), file);
    }
    assert.ok(!shouldIgnoreFile("app/page.tsx"));
  });

  it("allowlist is case-insensitive", () => {
    assert.ok(isAllowlisted("MOCK-API-KEY"));
    assert.ok(!isAllowlisted("real-looking-value"));
  });
});
