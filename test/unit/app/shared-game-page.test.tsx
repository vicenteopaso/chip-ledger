import { describe, expect, it, vi } from "vitest";

import SharedGamePage, { metadata } from "@/app/g/[id]/page";

// next/navigation's notFound() throws a special error; the page must call it for a bad id.
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));

describe("shared game page (SPEC-0003)", () => {
  it("REQ-0003-04: is never indexed and sends no referrer", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.referrer).toBe("no-referrer");
    expect(metadata.alternates).toEqual({ canonical: null });
  });

  it("REQ-0003-26: a malformed id is not found before anything is rendered", async () => {
    await expect(SharedGamePage({ params: Promise.resolve({ id: "short" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    await expect(
      SharedGamePage({ params: Promise.resolve({ id: "abcdefghijklmno!" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders the game for a well-formed id", async () => {
    const element = await SharedGamePage({ params: Promise.resolve({ id: "abcdefghijklmnop" }) });
    expect(element.props).toMatchObject({ id: "abcdefghijklmnop" });
  });
});
