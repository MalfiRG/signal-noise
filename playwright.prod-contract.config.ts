import { defineConfig, devices } from "@playwright/test";

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
    command:
      "VERCEL_ENV=production npm run build && npx vite preview --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    // WSL2 + NTFS cross-mount — build + cold preview boot needs up to 3 minutes
    timeout: 180_000,
  },
});
