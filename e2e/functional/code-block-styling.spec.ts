// Regression: code-block per-line dark stripes.
// Origin: <code class="language-…"> background drifted from the
// .code-block-wrapper inline style (#2d2d2d). Because <code> renders
// display:inline with white-space:pre, ANY background mismatch between
// <code> and its wrapper tiles only behind text on each visual line —
// producing the per-line stripe regression that has now been reported
// three times. Guard the invariant: codeBg === wrapperBg.
import { test, expect } from "@playwright/test";

const STYLE_TEST_URL = "/blog/style-test";

async function getCodeAndWrapperBg(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const code = document.querySelector('code[class*="language-"]') as HTMLElement | null;
    if (!code) return { error: "no code-block found", codeBg: null, wrapperBg: null };
    const wrapper = code.closest(".code-block-wrapper") as HTMLElement | null;
    if (!wrapper) return { error: "no .code-block-wrapper ancestor", codeBg: null, wrapperBg: null };
    return {
      error: null,
      codeBg: getComputedStyle(code).backgroundColor,
      wrapperBg: getComputedStyle(wrapper).backgroundColor,
    };
  });
}

test.describe("Blog code-block — uniform background (regression)", () => {
  for (const viewport of [
    { width: 1280, height: 720, name: "desktop" },
    { width: 375, height: 812, name: "mobile" },
  ]) {
    test(`<code> bg matches wrapper bg @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(STYLE_TEST_URL, { waitUntil: "networkidle" });
      // Wait for code-block to mount + prism to highlight.
      await page.waitForSelector('code[class*="language-"]', { timeout: 5000 });

      const result = await getCodeAndWrapperBg(page);
      expect(result.error, result.error ?? "").toBeNull();
      expect(result.codeBg).toBe(result.wrapperBg);
      // Defensive: also assert it's the canonical #2d2d2d (45,45,45). If
      // someone swaps the wrapper's hex they must update both ends.
      expect(result.codeBg).toBe("rgb(45, 45, 45)");
    });

    test(`every code-block on the page has matching code/wrapper bg @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(STYLE_TEST_URL, { waitUntil: "networkidle" });
      await page.waitForSelector('code[class*="language-"]', { timeout: 5000 });

      // Walk every code-block on the page; same invariant must hold for all.
      const mismatches = await page.evaluate(() => {
        const codes = Array.from(document.querySelectorAll('code[class*="language-"]')) as HTMLElement[];
        return codes
          .map((code, i) => {
            const wrapper = code.closest(".code-block-wrapper") as HTMLElement | null;
            const codeBg = getComputedStyle(code).backgroundColor;
            const wrapperBg = wrapper ? getComputedStyle(wrapper).backgroundColor : null;
            return { i, codeBg, wrapperBg, match: !!wrapper && codeBg === wrapperBg };
          })
          .filter((r) => !r.match);
      });
      expect(mismatches, JSON.stringify(mismatches)).toHaveLength(0);
    });
  }
});
