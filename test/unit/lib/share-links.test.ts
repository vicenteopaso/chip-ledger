import { describe, expect, it } from "vitest";

import {
  keysFor,
  LINK_HELP,
  OLDER_LINK_NOTICE,
  RETENTION_NOTICE,
  SEPARATE_STORAGE_NOTICE,
  shareLink,
} from "@/lib/share-links";
import { keysFromHash } from "@/lib/shared-game";

describe("share links (REQ-0003-02, -04, -22)", () => {
  it("puts the key after the # so the page request never carries it", () => {
    const link = shareLink("https://x.example", "abcdefghijklmnop", "K".repeat(22));
    expect(link).toBe(`https://x.example/g/abcdefghijklmnop#k=${"K".repeat(22)}`);
    expect(new URL(link).search).toBe("");
    expect(new URL(link).pathname).not.toContain("K");
  });

  it("REQ-0007-04: an edit link also carries the watch key, after the #, and a watch link carries nothing else", () => {
    const E = "E".repeat(22);
    const W = "W".repeat(22);
    const edit = shareLink("https://x.example", "abcdefghijklmnop", E, W);
    expect(edit).toBe(`https://x.example/g/abcdefghijklmnop#k=${E}&w=${W}`);
    expect(new URL(edit).search).toBe("");
    expect(keysFromHash(new URL(edit).hash)).toEqual({ key: E, watchKey: W });
    // Without a watch key, or when it would repeat the key, the link is as before.
    expect(shareLink("https://x.example", "abcdefghijklmnop", E, null)).not.toContain("&w=");
    expect(shareLink("https://x.example", "abcdefghijklmnop", W, W)).not.toContain("&w=");
  });

  it("REQ-0007-07, -09: says why an older link can't show the watch code, and where games are kept apart", () => {
    expect(OLDER_LINK_NOTICE).toMatch(/older edit link/);
    expect(OLDER_LINK_NOTICE).toMatch(/joined more recently/);
    expect(OLDER_LINK_NOTICE).not.toMatch(/Only the device that started sharing/);
    expect(SEPARATE_STORAGE_NOTICE).toMatch(/home screen/);
    expect(SEPARATE_STORAGE_NOTICE).toMatch(/separately/);
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
