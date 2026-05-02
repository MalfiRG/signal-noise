import { test, expect } from "@playwright/test";
import { prepareContext, settleStyles } from "../fixtures/visual-determinism";

test.beforeEach(async ({ page }) => {
  await prepareContext(page);
});

function hasMultiLayerGlow(shadow: string): boolean {
  return shadow.includes(",") && /\b\d{2,}(\.\d+)?px\b/.test(shadow);
}

test.describe("Skills page - tab selection glow framing", () => {
  test("SKILLS tab is active by default and has multi-layer glow", async ({ page }) => {
    await page.goto("/skills");
    await settleStyles(page);

    const skillsTab = page.getByRole("tab", { name: "SKILLS" });
    await expect(skillsTab).toBeVisible();
    await expect(skillsTab).toHaveAttribute("data-state", "active");

    const shadow = await skillsTab.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );
    expect(hasMultiLayerGlow(shadow)).toBe(true);
  });

  test("LEARNING tab gains amber glow after click", async ({ page }) => {
    await page.goto("/skills");
    await settleStyles(page);

    const learningTab = page.getByRole("tab", { name: "LEARNING" });
    await learningTab.click();
    await settleStyles(page);
    await expect(learningTab).toHaveAttribute("data-state", "active");

    const shadow = await learningTab.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );
    expect(hasMultiLayerGlow(shadow)).toBe(true);
  });

  test("inactive tab loses glow", async ({ page }) => {
    await page.goto("/skills");
    await settleStyles(page);

    const skillsTab = page.getByRole("tab", { name: "SKILLS" });
    const learningTab = page.getByRole("tab", { name: "LEARNING" });

    await learningTab.click();
    await settleStyles(page);
    await expect(skillsTab).toHaveAttribute("data-state", "inactive");

    const shadow = await skillsTab.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );
    expect(hasMultiLayerGlow(shadow)).toBe(false);
  });

  test("switching back to SKILLS restores its glow", async ({ page }) => {
    await page.goto("/skills");
    await settleStyles(page);

    const skillsTab = page.getByRole("tab", { name: "SKILLS" });
    const learningTab = page.getByRole("tab", { name: "LEARNING" });

    await learningTab.click();
    await settleStyles(page);
    await skillsTab.click();
    await settleStyles(page);
    await expect(skillsTab).toHaveAttribute("data-state", "active");

    const shadow = await skillsTab.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );
    expect(hasMultiLayerGlow(shadow)).toBe(true);
  });
});
