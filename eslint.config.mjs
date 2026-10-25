import nextVitals from "eslint-config-next/core-web-vitals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

// Layer contract from sdd.yaml (standards.architecture.layers), enforced here (CONSTITUTION-04).
const infra = {
  group: ["@/lib/infra", "@/lib/infra/*"],
  message: "UI must not import infra (sdd.yaml layers).",
};
const api = {
  group: ["@/app/api", "@/app/api/*"],
  message: "Only the framework calls route handlers.",
};
const ui = {
  group: ["@/app/components", "@/app/components/*"],
  message: "API routes must not import UI.",
};
const routes = {
  regex: "^@/app/(?!components/)",
  message: "Only the routes layer wires the app together.",
};
const app = { group: ["@/app", "@/app/*"], message: "Domain and infra must not import the app." };
// Relative parent imports would slip past the alias-based patterns above.
const parent = {
  group: ["../*", "../**"],
  message: "Import with the @/ alias so layer rules apply.",
};
const react = {
  group: ["react", "react-dom", "react/*", "next", "next/*"],
  message: "Domain is framework-agnostic.",
};

const restrict = (...patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      "scripts/**",
    ],
  },
  ...nextVitals,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      "jsx-a11y/label-has-associated-control": [
        "error",
        { assert: "either", controlComponents: ["DraftInput"], depth: 3 },
      ],
      "no-console": "error",
      "no-empty": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  { files: ["app/**", "lib/**"], rules: restrict(parent) },
  { files: ["app/components/**"], rules: restrict(parent, infra, api, routes) },
  { files: ["lib/**"], ignores: ["lib/infra/**"], rules: restrict(parent, infra, app, react) },
  { files: ["lib/infra/**"], rules: restrict(parent, app) },
  { files: ["app/api/**"], rules: restrict(parent, ui) },
  {
    // The central logger is the one place allowed to write to the console (docs/ERROR_HANDLING.md).
    files: ["lib/error-logging.ts"],
    rules: { "no-console": "off" },
  },
  {
    files: ["test/**", "*.config.{ts,mjs}", "proxy.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    // `expect(window.scrollTo).toHaveBeenCalled()` passes a method reference on purpose.
    files: ["test/**"],
    rules: { "@typescript-eslint/unbound-method": "off" },
  },
);
