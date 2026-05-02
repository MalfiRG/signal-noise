import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 4,
  // dual reporter — wall-clock guard requires results.json (html alone omits it)
  reporter: process.env.CI
    ? [["html"], ["json", { outputFile: "playwright-report/results.json" }]]
    : "html",
  timeout: 30000,
  use: {
    // 127.0.0.1 not localhost — avoids IPv4/IPv6 mismatch with webServer bind
    baseURL: "http://127.0.0.1:8080",
    trace: "on-first-retry",
    timezoneId: "UTC",
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
    {
      name: "design",
      testDir: "./e2e/design",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: !process.env.CI,
    // WSL2 + NTFS cross-mount — Vite cold start can take 30-60s; default 60s flakes
    timeout: 120_000,
  },
});
