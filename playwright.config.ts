import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Fix C4: dual reporter on CI so the wall-clock guard can read results.json.
  // The HTML reporter alone does NOT emit results.json; the wall-clock guard
  // would then read 0 and silently pass regardless of actual smoke duration.
  reporter: process.env.CI
    ? [["html"], ["json", { outputFile: "playwright-report/results.json" }]]
    : "html",
  timeout: 30000,
  use: {
    // Fix M19: standardize on 127.0.0.1 across smoke/functional and the visual
    // config to avoid IPv4/IPv6 mismatch when the webServer binds 127.0.0.1
    // but specs hit "localhost".
    baseURL: "http://127.0.0.1:8080",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "smoke",
      testDir: "./e2e/smoke",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "functional",
      testDir: "./e2e/functional",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: !process.env.CI,
    // WSL2 + NTFS cross-mount: Vite's first cold start scans src/ and
    // node_modules/ over a slow filesystem and can take 30–60 seconds.
    // Default 60s timeout is too tight; bump to 120s to avoid flake.
    timeout: 120_000,
  },
});
