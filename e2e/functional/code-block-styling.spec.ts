// see ARCHITECTURE.md §12 / Code-block uniform-background regression
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

test.describe("Blog code-block - uniform background (regression)", () => {
  for (const viewport of [
    { width: 1280, height: 720, name: "desktop" },
    { width: 375, height: 812, name: "mobile" },
  ]) {
    test(`<code> bg matches wrapper bg @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(STYLE_TEST_URL, { waitUntil: "networkidle" });
      await page.waitForSelector('code[class*="language-"]', { timeout: 5000 });

      const result = await getCodeAndWrapperBg(page);
      expect(result.error, result.error ?? "").toBeNull();
      expect(result.codeBg).toBe(result.wrapperBg);
      expect(result.codeBg).toBe("rgb(45, 45, 45)");
    });

    test(`every code-block on the page has matching code/wrapper bg @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(STYLE_TEST_URL, { waitUntil: "networkidle" });
      await page.waitForSelector('code[class*="language-"]', { timeout: 5000 });

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

// see ARCHITECTURE.md §12 / Inline-code mobile overflow regression
test.describe("Inline-code overflow guard (regression)", () => {
  for (const viewport of [
    { width: 375, height: 812, name: "iphone-se" },
    { width: 414, height: 900, name: "iphone-pro" },
  ]) {
    test(`document does not exceed viewport width with long inline-code @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(STYLE_TEST_URL, { waitUntil: "networkidle" });
      await page.waitForSelector(".markdown-body code", { timeout: 5000 });

      const widths = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        bodyWidth: document.body.getBoundingClientRect().width,
      }));
      expect(widths.scrollWidth).toBeLessThanOrEqual(widths.innerWidth + 1);
      expect(widths.bodyWidth).toBeLessThanOrEqual(widths.innerWidth + 1);
    });

    test(`inline-code element wraps inside the pill (overflow-wrap: anywhere) @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(STYLE_TEST_URL, { waitUntil: "networkidle" });
      await page.waitForSelector(".markdown-body code", { timeout: 5000 });

      const wrap = await page.evaluate(() => {
        const inline = Array.from(document.querySelectorAll(".markdown-body code"))
          .find((c) => !(c as HTMLElement).matches('[class*="language-"]')) as HTMLElement | undefined;
        return inline ? getComputedStyle(inline).overflowWrap : null;
      });
      expect(wrap === "anywhere" || wrap === "break-word", `overflowWrap=${wrap}`).toBe(true);
    });
  }
});

// see ARCHITECTURE.md §12 / Fenced-code pill exclusion regression
test.describe("Fenced code excluded from inline-pill styling (regression)", () => {
  for (const viewport of [
    { width: 1280, height: 720, name: "desktop" },
    { width: 375, height: 812, name: "mobile" },
  ]) {
    test(`fenced <code> has zero border + zero pill padding @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(STYLE_TEST_URL, { waitUntil: "networkidle" });
      await page.waitForSelector('code[class*="language-"]', { timeout: 5000 });

      const violations = await page.evaluate(() => {
        const codes = Array.from(document.querySelectorAll('code[class*="language-"]')) as HTMLElement[];
        return codes
          .map((code, i) => {
            const cs = getComputedStyle(code);
            return {
              i,
              borderTopWidth: cs.borderTopWidth,
              paddingLeft: cs.paddingLeft,
              borderRadius: cs.borderTopLeftRadius,
            };
          })
          .filter((r) => r.borderTopWidth !== "0px" || r.paddingLeft !== "0px");
      });
      expect(violations, JSON.stringify(violations)).toHaveLength(0);
    });
  }
});

// see ARCHITECTURE.md §12 / Reading-mode code-block frame regression
test.describe("Reading-mode code-block frame (regression)", () => {
  for (const viewport of [
    { width: 1280, height: 720, name: "desktop" },
    { width: 375, height: 812, name: "mobile" },
  ]) {
    test(`.code-block-wrapper has visible frame in reading mode @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(STYLE_TEST_URL, { waitUntil: "networkidle" });
      await page.waitForSelector(".theme-reading .code-block-wrapper", { timeout: 5000 });

      const frame = await page.evaluate(() => {
        const wrapper = document.querySelector(".theme-reading .code-block-wrapper") as HTMLElement | null;
        if (!wrapper) return null;
        const cs = getComputedStyle(wrapper);
        return {
          borderWidth: cs.borderTopWidth,
          borderRadius: cs.borderTopLeftRadius,
          boxShadow: cs.boxShadow,
        };
      });
      expect(frame, "no .theme-reading .code-block-wrapper found").not.toBeNull();
      const borderPx = parseFloat(String(frame!.borderWidth));
      expect(borderPx).toBeGreaterThanOrEqual(1);
      const radiusPx = parseFloat(String(frame!.borderRadius));
      expect(radiusPx).toBeGreaterThanOrEqual(4);
      expect(frame!.boxShadow).not.toBe("none");
    });
  }
});

// see ARCHITECTURE.md §12 / Reading-mode inline-code pill regression
test.describe("Reading-mode inline-code pill styling (regression)", () => {
  for (const viewport of [
    { width: 1280, height: 720, name: "desktop" },
    { width: 375, height: 812, name: "mobile" },
  ]) {
    test(`inline <code> has pill styling (padding, radius, border, bg) @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(STYLE_TEST_URL, { waitUntil: "networkidle" });
      await page.waitForSelector(".markdown-body code", { timeout: 5000 });

      const pill = await page.evaluate(() => {
        const inline = Array.from(document.querySelectorAll(".markdown-body code"))
          .find((c) => !(c as HTMLElement).matches('[class*="language-"]')) as HTMLElement | undefined;
        if (!inline) return null;
        const cs = getComputedStyle(inline);
        return {
          paddingLeft: cs.paddingLeft,
          borderRadius: cs.borderTopLeftRadius,
          borderWidth: cs.borderTopWidth,
          backgroundColor: cs.backgroundColor,
        };
      });
      expect(pill, "no inline <code> found in markdown-body").not.toBeNull();
      const padPx = parseFloat(String(pill!.paddingLeft));
      expect(padPx).toBeGreaterThan(4);
      expect(parseFloat(String(pill!.borderRadius))).toBeGreaterThanOrEqual(3);
      expect(parseFloat(String(pill!.borderWidth))).toBeGreaterThanOrEqual(1);
      expect(pill!.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    });
  }
});
