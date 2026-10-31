import { describe, expect, it } from "vitest";

import { qrModules } from "@/lib/qr";

const FINDER = ["1111111", "1000001", "1011101", "1011101", "1011101", "1000001", "1111111"];
const rows = (m: boolean[][], x: number, y: number) =>
  m.slice(y, y + 7).map((row) =>
    row
      .slice(x, x + 7)
      .map((v) => (v ? "1" : "0"))
      .join(""),
  );

describe("qrModules (REQ-0003-02)", () => {
  const link = "https://chip-ledger.example/g/abcdefghijklmnop#k=AAAAAAAAAAAAAAAAAAAAAA";
  const modules = qrModules(link);

  it("is a square grid with the three finder squares a scanner looks for", () => {
    expect(modules.length).toBeGreaterThanOrEqual(21);
    for (const row of modules) expect(row).toHaveLength(modules.length);
    const last = modules.length - 7;
    expect(rows(modules, 0, 0)).toEqual(FINDER);
    expect(rows(modules, last, 0)).toEqual(FINDER);
    expect(rows(modules, 0, last)).toEqual(FINDER);
  });

  it("gives the same code for the same link and a different one for another link", () => {
    expect(qrModules(link)).toEqual(modules);
    expect(qrModules(link.replace("AAAA", "BBBB"))).not.toEqual(modules);
  });

  it("has no border of its own; the drawing adds the quiet zone", () => {
    expect(modules[0]?.[0]).toBe(true);
  });
});
