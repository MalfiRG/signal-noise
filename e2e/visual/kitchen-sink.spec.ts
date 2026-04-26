import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { prepareContext, stabilizeForLayout } from "../fixtures/visual-determinism";

// spec §4 — hard-fail --update-snapshots outside pinned Docker image
// Playwright 1.58.2 — beforeAll requires destructuring pattern on first arg
// eslint-disable-next-line no-empty-pattern
test.beforeAll(({}, testInfo) => {
  // Playwright 1.58.2 updateSnapshots default is "missing"; only "all"/"changed" overwrite
  const updateMode = testInfo.config.updateSnapshots;
  if (updateMode === "all" || updateMode === "changed") {
    const isDocker = existsSync("/.dockerenv");
    if (!isDocker && !process.env.ALLOW_HOST_SNAPSHOT_UPDATE) {
      throw new Error(
        "Visual baselines must be regenerated in the pinned Docker image. " +
          "Use `npm run test:e2e:update-baselines`. Override with " +
          "ALLOW_HOST_SNAPSHOT_UPDATE=1 only for emergencies."
      );
    }
  }
});

test.describe("Kitchen-sink visual regression", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("/blog/style-test renders deterministically at 390px", async ({ page }) => {
    await prepareContext(page);
    await page.goto("/blog/style-test");
    await stabilizeForLayout(page, {
      mermaid: true,
      readyLocator: page.locator(".markdown-body"),
    });

    await expect(page).toHaveScreenshot("style-test-390w.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
      timeout: 15000,
    });
  });
});
