import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Top-level ignores. visual-mobile.spec.ts is the Wave 1 quarantined spec
  // that gets REWRITTEN into e2e/visual/kitchen-sink.spec.ts in Wave 4 per
  // spec §5 — skip it from lint until that rewrite lands.
  { ignores: ["dist", "e2e/visual-mobile.spec.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Workspace-level tautology warn. Smoke and functional tier blocks
      // below set no-restricted-syntax to their own (stricter) values which
      // REPLACE this rule per ESLint flat-config semantics — value=true is
      // forbidden in those tiers; value=1 is warned workspace-wide.
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='toBe'][callee.object.type='CallExpression'][callee.object.callee.name='expect'][callee.object.arguments.0.type='Literal'][callee.object.arguments.0.value=1][arguments.0.type='Literal'][arguments.0.value=1]",
          message: "Tautology assertion expect(1).toBe(1) is forbidden.",
        },
      ],
    },
  },
  // Smoke tier — e2e/smoke/**/*.ts
  // Fix C2: AST selector for expect(X).toBe(Y) MUST use
  // callee.object.type='CallExpression' (the inner expect() is a
  // CallExpression, NOT an Identifier named 'expect').
  {
    files: ["e2e/smoke/**/*.ts"],
    ignores: ["e2e/_stopgap/**", "e2e/_verification/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='toHaveScreenshot']",
          message:
            "Smoke tier forbids visual snapshots. Move to functional/ or visual/.",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='addStyleTag']",
          message: "Smoke tier forbids addStyleTag — keep smoke tests trivial.",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='waitForTimeout'][arguments.0.type='Literal'][arguments.0.value>=1000]",
          message:
            "waitForTimeout(>=1000) is forbidden. Use a web-first assertion.",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='toBe'][callee.object.type='CallExpression'][callee.object.callee.name='expect'][callee.object.arguments.0.type='Literal'][callee.object.arguments.0.value=true][arguments.0.type='Literal'][arguments.0.value=true]",
          message:
            "Tautology assertion expect(true).toBe(true) is forbidden.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../functional/_helpers/*", "../visual/_helpers/*"],
              message:
                "Tier-internal helpers cannot be imported across tiers.",
            },
          ],
        },
      ],
    },
  },
  // Functional tier — e2e/functional/**/*.ts
  {
    files: ["e2e/functional/**/*.ts"],
    ignores: ["e2e/_stopgap/**", "e2e/_verification/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='toHaveScreenshot']",
          message:
            "Functional tier forbids visual snapshots. Move to e2e/visual/ + playwright.visual.config.ts.",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='waitForTimeout'][arguments.0.type='Literal'][arguments.0.value>=1000]",
          message:
            "waitForTimeout(>=1000) is forbidden. Use stabilizeForLayout or a web-first assertion.",
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='toBe'][callee.object.type='CallExpression'][callee.object.callee.name='expect'][callee.object.arguments.0.type='Literal'][callee.object.arguments.0.value=true][arguments.0.type='Literal'][arguments.0.value=true]",
          message:
            "Tautology assertion expect(true).toBe(true) is forbidden.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../smoke/_helpers/*", "../visual/_helpers/*"],
              message:
                "Tier-internal helpers cannot be imported across tiers.",
            },
          ],
        },
      ],
    },
  },
  // Fixtures override — MUST come after the general `**/*.{ts,tsx}` block so
  // this rule-off setting wins per ESLint flat-config semantics (later block
  // overrides earlier for the same rule on the same file). e2e/fixtures/
  // uses Playwright's `use` callback-parameter name, which
  // react-hooks/rules-of-hooks misidentifies as a React hook call. Scoped
  // narrowly so the rule still applies everywhere else.
  {
    files: ["e2e/fixtures/**/*.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
);
