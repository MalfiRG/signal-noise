import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Pre-goto primitives — call BEFORE page.goto (typically inside a fixture).
// ---------------------------------------------------------------------------

/**
 * Inject a stylesheet that zeros animations/transitions; prepended as first
 * <head> child so author rules cannot win the source-order tie-break.
 *
 * NOTE: framer-motion `layout` animations are rAF-driven via useLayoutEffect
 * and are NOT covered — tests using `layout` must wrap with
 * <MotionConfig reducedMotion="always"> in a test-only render.
 */
export async function freezeAnimationsViaInitScript(page: Page) {
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.id = "__test-determinism";
    style.textContent = `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
    `;
    document.head.prepend(style);
  });
}

/**
 * Pre-seed sessionStorage to skip the hero cascade. Must use addInitScript
 * so it fires BEFORE useState in Index.tsx on every navigation.
 */
export async function skipHeroCascadeViaInitScript(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("hero-cascade-played", "1");
  });
}

// ---------------------------------------------------------------------------
// Post-goto primitives — call AFTER page.goto.
// ---------------------------------------------------------------------------

/**
 * Wait for pending @font-face downloads. Watchdog timeout prevents stalled
 * FontFaceSet from hanging the run.
 */
export async function waitForFonts(page: Page, timeoutMs = 10_000) {
  await page.evaluate(async (timeout: number) => {
    await Promise.race([
      document.fonts.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`document.fonts.ready stalled after ${timeout}ms`)), timeout)
      ),
    ]);
  }, timeoutMs);
}

/**
 * Wait for every rendered Mermaid SVG to have a measurable bbox.
 * Selector targets `svg[id^='mermaid-']` (id lives on the svg itself).
 * getBBox() throws on hidden/detached SVGs — try/catch keeps polling.
 */
export async function waitForMermaid(page: Page) {
  await page.waitForFunction(
    () => {
      const svgs = document.querySelectorAll("svg[id^='mermaid-']");
      if (svgs.length === 0) return false;
      return Array.from(svgs).every((s) => {
        try {
          return (s as SVGGraphicsElement).getBBox().width > 0;
        } catch {
          return false;
        }
      });
    },
    { timeout: 15000 }
  );
}

/**
 * Double-rAF — single rAF resolves before paint in Chromium's pipeline,
 * so two are required to guarantee the screenshot captures post-paint state.
 */
export async function settleStyles(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve())
        )
      )
  );
}

// ---------------------------------------------------------------------------
// Composed convenience entry points (the façade layer).
// ---------------------------------------------------------------------------

export async function prepareContext(
  page: Page,
  opts?: { skipHeroCascade?: boolean; freezeKeyframes?: boolean }
) {
  if (opts?.freezeKeyframes !== false) {
    await freezeAnimationsViaInitScript(page);
  }
  if (opts?.skipHeroCascade !== false) {
    await skipHeroCascadeViaInitScript(page);
  }
}

export async function stabilizeForLayout(
  page: Page,
  opts?: {
    mermaid?: boolean;
    reducedMotion?: boolean;
    readyLocator?: Locator;
  }
) {
  await waitForFonts(page);
  if (opts?.mermaid) await waitForMermaid(page);
  await settleStyles(page);
  if (opts?.readyLocator) {
    await expect(opts.readyLocator).toBeVisible();
  }
}
