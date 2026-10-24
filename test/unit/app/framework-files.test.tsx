import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import RouteError from "@/app/error";
import NotFound from "@/app/not-found";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { proxy } from "@/proxy";

describe("error boundary", () => {
  it("shows a generic message, logs the detail, and retries", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const reset = vi.fn();
    render(<RouteError error={new Error("secret internal detail")} reset={reset} />);
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.queryByText(/secret internal detail/)).not.toBeInTheDocument();
    expect(String(log.mock.calls[0]?.[0])).toContain("secret internal detail");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});

describe("not found page", () => {
  it("links back to the app", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: "Go to Chip Ledger" })).toHaveAttribute("href", "/");
  });
});

describe("robots and sitemap", () => {
  it("are generated from the SEO module", () => {
    expect(robots().sitemap).toBe("http://localhost:3000/sitemap.xml");
    expect(sitemap()).toEqual([{ url: "http://localhost:3000/" }]);
  });
});

describe("proxy", () => {
  it("sets a fresh nonce CSP on the request and the response", () => {
    const first = proxy(new NextRequest("http://localhost:3000/"));
    const second = proxy(new NextRequest("http://localhost:3000/"));
    const csp = first.headers.get("content-security-policy") ?? "";
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp).not.toBe(second.headers.get("content-security-policy"));
  });
});
