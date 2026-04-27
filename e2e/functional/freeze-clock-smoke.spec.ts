import { test, expect } from "@playwright/test";
import { prepareContext } from "../fixtures/visual-determinism";

test("freezeClockViaInitScript fixes Date.now() to 2026-04-27T12:00:00Z", async ({ page }) => {
  await prepareContext(page, { freezeClock: true });
  await page.goto("/");
  const frozen = await page.evaluate(() => Date.now());
  expect(frozen).toBe(Date.UTC(2026, 3, 27, 12, 0, 0));
  const perfFrozen = await page.evaluate(() => performance.now());
  // perf.now is frozen to a single value — calling twice returns the same.
  const perfFrozen2 = await page.evaluate(() => performance.now());
  expect(perfFrozen2).toBe(perfFrozen);
});
