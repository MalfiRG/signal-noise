import { defineConfig, devices } from "@playwright/test";

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
    // distinct port from dev (8080) and prod-contract (4173) — no collisions
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
