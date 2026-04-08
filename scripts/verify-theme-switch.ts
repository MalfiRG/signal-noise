/**
 * Playwright verification — theme switching + MatrixRain color propagation.
 *
 * Iterates over the configured themes, programmatically clicks each theme dot
 * via the aria-label selector, captures two screenshots per theme:
 *   - {name}-100ms.png   → catches the bug evidence: new characters drawn
 *                          AFTER theme switch must already be in new color.
 *                          Old characters (mid-fall) may still be old color
 *                          and that is acceptable per the user's intent.
 *   - {name}-1600ms.png  → steady state: trail fade has erased old characters,
 *                          entire rain should be in new color.
 *
 * Also reads the live CSS variables (--matrix-rain-color, --primary,
 * --background) from :root via getComputedStyle, so we can assert at the
 * CSS-layer level that the theme switch propagated. The JS-layer propagation
 * (the bug we are fixing) is then visible in the screenshots.
 *
 * Usage:
 *   npx tsx scripts/verify-theme-switch.ts                    # current themes
 *   THEMES=violet,amber npx tsx scripts/verify-theme-switch.ts # explicit list
 *
 * Output dir: /tmp/theme-verify/
 */

import { chromium, Page } from "playwright";
import { mkdirSync } from "node:fs";

const OUT_DIR = "/tmp/theme-verify";
const BLOG_URL = "http://localhost:8080/";
// Default reflects post-refactor state: 2 themes (violet + amber).
// Override with THEMES env var if you want to test a subset or future additions.
const THEMES = (process.env.THEMES ?? "violet,amber").split(",");

interface ThemeSnapshot {
  theme: string;
  cssVars: Record<string, string>;
  htmlClass: string;
}

async function snapshotCssVars(page: Page, theme: string): Promise<ThemeSnapshot> {
  // NOTE: tsx/esbuild injects __name() helpers around named functions, which
  // breaks inside page.evaluate (the helper symbol isn't available in the
  // browser eval context). Inline the property reads — no closure helpers.
  const result = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      htmlClass: document.documentElement.className,
      rainColor: style.getPropertyValue("--matrix-rain-color").trim(),
      primary: style.getPropertyValue("--primary").trim(),
      background: style.getPropertyValue("--background").trim(),
      foreground: style.getPropertyValue("--foreground").trim(),
    };
  });
  return {
    theme,
    htmlClass: result.htmlClass,
    cssVars: {
      "--matrix-rain-color": result.rainColor,
      "--primary": result.primary,
      "--background": result.background,
      "--foreground": result.foreground,
    },
  };
}

async function switchTheme(page: Page, theme: string): Promise<void> {
  // ThemeSelector uses aria-label="Switch to {Label} theme" on each dot.
  // Capitalise first letter to match the THEMES const in ThemeSelector.tsx.
  const label = theme.charAt(0).toUpperCase() + theme.slice(1);
  const selector = `button[aria-label="Switch to ${label} theme"]`;
  const button = page.locator(selector);
  const count = await button.count();
  if (count === 0) {
    throw new Error(
      `Theme dot not found for "${theme}" — selector "${selector}" matched 0 elements. ` +
      `Check ThemeSelector.tsx THEMES constant matches the env list.`
    );
  }
  await button.first().click();
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  console.log(`Loading ${BLOG_URL} …`);
  await page.goto(BLOG_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500); // give next-themes hydration + initial rain frames

  const snapshots: ThemeSnapshot[] = [];

  for (const theme of THEMES) {
    console.log(`\n--- Theme: ${theme} ---`);
    await switchTheme(page, theme);

    // t=100ms: bug evidence frame. New rain chars must already be new color.
    await page.waitForTimeout(100);
    const fastPath = `${OUT_DIR}/${theme}-100ms.png`;
    await page.screenshot({ path: fastPath });
    console.log(`  100ms shot:  ${fastPath}`);

    // t=1600ms: steady state. Trail fade has cleared old chars by now.
    await page.waitForTimeout(1500);
    const slowPath = `${OUT_DIR}/${theme}-1600ms.png`;
    await page.screenshot({ path: slowPath });
    console.log(`  1600ms shot: ${slowPath}`);

    // Snapshot CSS vars for assertion-level verification.
    const snap = await snapshotCssVars(page, theme);
    snapshots.push(snap);
    console.log(`  html class:  "${snap.htmlClass}"`);
    console.log(`  --matrix-rain-color: "${snap.cssVars["--matrix-rain-color"]}"`);
    console.log(`  --primary:           "${snap.cssVars["--primary"]}"`);
    console.log(`  --background:        "${snap.cssVars["--background"]}"`);
  }

  await browser.close();

  // Sanity check: every theme must have produced a unique --matrix-rain-color,
  // otherwise the theme switch is not propagating to the CSS layer.
  const rainColors = new Set(snapshots.map((s) => s.cssVars["--matrix-rain-color"]));
  console.log("\n--- Verification ---");
  console.log(`Unique --matrix-rain-color values: ${rainColors.size}/${snapshots.length}`);
  if (rainColors.size !== snapshots.length) {
    console.error(
      "FAIL: themes share the same --matrix-rain-color. CSS layer is not toggling."
    );
    process.exit(1);
  }
  console.log("PASS: every theme has a distinct --matrix-rain-color value at CSS layer.");
  console.log(`\nVisual evidence in ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
