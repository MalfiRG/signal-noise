import { defineConfig, devices } from "@playwright/test";

/**
 * Vercel-preview-build contract suite. Simulates a Vercel preview deploy by
 * setting VERCEL_ENV=preview before the build, which the build script bridges
 * to VITE_VERCEL_ENV. This drives detectVisibilityMode → "preview", which
 * shows drafts so authors can review them on the preview URL.
 *
 * Why a separate config: the prod-contract suite runs with
 * VERCEL_ENV=production and asserts drafts are hidden; this suite runs with
 * VERCEL_ENV=preview and asserts drafts ARE visible. Together they cover
 * both halves of the production/preview split.
 *
 * Run via:
 *   npm run test:e2e:preview-contract
 */
export default defineConfig({
  testDir: "./e2e/preview-contract",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html"], ["json", { outputFile: "playwright-report/results.json" }]]
    : "html",
  timeout: 30_000,
  use: {
    // Distinct port from dev (8080) and prod-contract (4173) so the three
    // configs cannot collide on a developer's machine.
    baseURL: "http://127.0.0.1:4174",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "preview-contract",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      "VERCEL_ENV=preview npm run build && npx vite preview --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
