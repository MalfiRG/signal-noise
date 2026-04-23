import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "html",
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:8080",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "visual",
      testDir: "./e2e/visual",
      use: { ...devices["Desktop Chrome"] },
      // Fix H10: include the platform token so baseline filenames carry the
      // -chromium-linux suffix that every Wave 4 path reference assumes.
      snapshotPathTemplate:
        "{testDir}/__snapshots__/{testFileName}/{arg}-{platform}{ext}",
    },
  ],
  webServer: {
    command: "npm run preview -- --port 8080 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: false,
    env: { SKIP_GITHUB_FETCH: "1" },
  },
});
