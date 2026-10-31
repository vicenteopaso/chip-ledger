import { describe, expect, it } from "vitest";

import { keysFor, LINK_HELP, RETENTION_NOTICE, shareLink } from "@/lib/share-links";

describe("share links (REQ-0003-02, -04, -22)", () => {
  it("puts the key after the # so the page request never carries it", () => {
    const link = shareLink("https://x.example", "abcdefghijklmnop", "K".repeat(22));
    expect(link).toBe(`https://x.example/g/abcdefghijklmnop#k=${"K".repeat(22)}`);
    expect(new URL(link).search).toBe("");
    expect(new URL(link).pathname).not.toContain("K");
  });

  it("an editor offers the edit link, and the watch link only if this device kept it", () => {
    expect(keysFor("edit", "E", null)).toEqual({ watch: null, edit: "E" });
    expect(keysFor("edit", "E", "W")).toEqual({ watch: "W", edit: "E" });
  });

  it("a watcher offers only the watch link", () => {
    expect(keysFor("watch", "W", null)).toEqual({ watch: "W", edit: null });
  });

  it("says in words what is kept and for how long, and what each link allows", () => {
    expect(RETENTION_NOTICE).toMatch(/names/);
    expect(RETENTION_NOTICE).toMatch(/24 hours/);
    expect(RETENTION_NOTICE).toMatch(/30 days/);
    expect(LINK_HELP.watch).toMatch(/not change/);
    expect(LINK_HELP.edit).toMatch(/co-host/);
  });
});
