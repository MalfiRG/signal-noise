import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
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
      // ESLint flat config — later tier blocks REPLACE this rule, not merge
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
  // AST selector: inner expect() is CallExpression, not Identifier
  {
    files: ["e2e/smoke/**/*.ts"],
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
  {
    files: ["e2e/functional/**/*.ts"],
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
  // Fixtures override — ESLint flat-config source order (later wins)
  // Playwright `use` param trips react-hooks/rules-of-hooks; scope narrowly
  {
    files: ["e2e/fixtures/**/*.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
);
