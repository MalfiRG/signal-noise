import { defineConfig, devices } from "@playwright/test";

/**
 * Production-build contract suite. Builds the site (`vite build`) and serves
 * it via `vite preview`, then runs specs that lock contracts only observable
 * in a real production bundle — most notably `import.meta.env.PROD === true`
 * static substitution (e.g. the draft-post filter).
 *
 * Why a separate config: the default `playwright.config.ts` runs against
 * `npm run dev`, where PROD is false. Running prod-only assertions there
 * would silently pass for the wrong reason (drafts visible in dev because
 * the filter is bypassed, not because the filter is broken).
 *
 * Run via:
 *   npm run test:e2e:prod-contract
 */
export default defineConfig({
  testDir: "./e2e/prod-contract",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html"], ["json", { outputFile: "playwright-report/results.json" }]]
    : "html",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "prod-contract",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Simulates a Vercel main-domain production deploy by setting
    // VERCEL_ENV=production before the build, which the build script bridges
    // to VITE_VERCEL_ENV. This drives detectVisibilityMode → "production",
    // which is the only tier that hides drafts.
    //
    // Distinct from dev port 8080 so the two configs cannot collide.
    command:
      "VERCEL_ENV=production npm run build && npx vite preview --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    // Build + cold preview boot is heavier than dev; allow up to 3 minutes
    // on WSL2 + NTFS cross-mount.
    timeout: 180_000,
  },
});
