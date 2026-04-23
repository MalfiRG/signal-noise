import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { prepareContext, stabilizeForLayout } from "../fixtures/visual-determinism";

// Per spec §4: hard-fail if --update-snapshots runs outside the pinned
// Docker image. The ALLOW_HOST_SNAPSHOT_UPDATE env var is an explicit
// emergency escape hatch.
// Playwright 1.58.2 enforces a destructuring pattern on the first arg of
// beforeAll; single-arg (testInfo) => ... is rejected at parse time. The
// empty destructure is the only legal form when we don't need fixtures.
// eslint-disable-next-line no-empty-pattern
test.beforeAll(({}, testInfo) => {
  if (testInfo.config.updateSnapshots !== "none") {
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
