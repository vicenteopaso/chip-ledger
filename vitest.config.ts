import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Thresholds mirror sdd.yaml (devex.ci.coverage-thresholds). Do not lower them (CONSTITUTION-14).
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    environment: "jsdom",
    include: ["test/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "app/**/*.{ts,tsx}", "proxy.ts"],
      exclude: [
        // Framework entry points that need a running Next.js server; covered by test/e2e.
        "app/layout.tsx",
        "app/page.tsx",
        "app/global-error.tsx",
      ],
      thresholds: { lines: 90, statements: 90, branches: 85, functions: 90 },
    },
  },
});
