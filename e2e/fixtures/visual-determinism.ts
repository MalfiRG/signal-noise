import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Pre-goto primitives — call BEFORE page.goto (typically inside a fixture).
// ---------------------------------------------------------------------------

/**
 * Inject a stylesheet that zeros animations and transitions and forces
 * scroll-behavior: auto. Uses addInitScript so the style is in the DOM
 * BEFORE any author stylesheet loads — and prepended as the FIRST child
 * of <head> so author rules cannot win on source-order tie-break.
 *
 * Note: framer-motion's `layout` animations are rAF-driven via
 * useLayoutEffect and are NOT covered by this CSS injection. Tests that
 * exercise `layout` props must additionally wrap with
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
 * Pre-seed sessionStorage so Index.tsx's useState initializer
 * (Index.tsx:14-19) captures `true` instead of `false`, skipping the
 * 6-second hero cascade entirely. Must run via addInitScript so it
 * fires BEFORE the React tree's useState executes on every navigation.
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
 * Resolve when all currently pending @font-face downloads complete and
 * their faces become "loaded". Replaces every waitForTimeout(1500) in the
 * suite. The async wrapper discards FontFaceSet — the helper is void.
 *
 * Fix L1: watchdog so a stalled FontFaceSet cannot hang the run indefinitely.
 */
export async function waitForFonts(page: Page, timeoutMs = 10_000) {
  await page.evaluate(async (timeout) => {
    await Promise.race([
      document.fonts.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`document.fonts.ready stalled after ${timeout}ms`)), timeout)
      ),
    ]);
  }, timeoutMs);
}

/**
 * Mermaid diagrams render via an async observer. Wait for every
 * placeholder to have a corresponding non-zero-bbox <svg>. The previous
 * `length > 0` check returned true after the FIRST diagram rendered;
 * style-test has multiple, so screenshots captured a partial render.
 *
 * Fix M6: getBBox() throws on hidden/detached SVGs — wrap in try/catch
 * and treat as not-yet-measurable so the polling loop continues instead
 * of failing.
 */
export async function waitForMermaid(page: Page) {
  await page.waitForFunction(
    () => {
      const placeholders = document.querySelectorAll(
        "pre.mermaid, [id^='mermaid-']"
      );
      const svgs = document.querySelectorAll("[id^='mermaid-'] svg");
      if (svgs.length === 0 || svgs.length < placeholders.length) return false;
      return Array.from(svgs).every((s) => {
        try {
          return (s as SVGGraphicsElement).getBBox().width > 0;
        } catch {
          return false; // not yet measurable — keep polling
        }
      });
    },
    { timeout: 15000 }
  );
}

/**
 * Double-rAF: the FIRST rAF schedules a callback in the same frame; the
 * SECOND rAF guarantees the paint after the first has committed. A single
 * rAF resolves before paint — Chromium's pipeline is rAF callbacks → style
 * → layout → paint → composite, so a single-rAF screenshot can capture
 * mid-paint state.
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
  // Fix H3: freezeKeyframes is opt-out so Wave 2 verification can decide
  // whether the freezeAnimationsViaInitScript step is load-bearing for
  // CSS keyframe coverage on Playwright 1.58.2. Default stays true for safety.
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
