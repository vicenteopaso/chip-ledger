import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "@/app/components/SiteFooter";
import { SITE } from "@/lib/seo";

describe("SiteFooter", () => {
  it("REQ-0001-31: shows the copyright with the given year, as a contentinfo landmark", () => {
    render(<SiteFooter year={2031} holders={SITE.copyrightHolders} />);
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "© 2031 Jason Johnson and Vicente Opaso",
    );
  });
});
