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

/**
 * Freeze Date.now / new Date(...) AND performance.now() to a fixed instant
 * so the IdStrip's live clock and any monotonic-clock-driven CSS animation
 * (e.g. cursor-blink) produce stable visual baselines.
 *
 * Fixed instant: 2026-04-27T12:00:00.000Z. Run BEFORE freezeAnimationsViaInitScript
 * to avoid setTimeout(0) re-entrancy issues during page boot.
 *
 * Note: process.env.TZ=UTC must also be set in playwright.config.ts so
 * formatTimeOfDay() (which uses local zone in production) renders the same
 * local hours as the UTC instant — otherwise CI (UTC) and local-dev (Prague)
 * baselines diverge.
 */
export async function freezeClockViaInitScript(page: Page) {
  await page.addInitScript(() => {
    const FIXED_INSTANT_MS = Date.UTC(2026, 3, 27, 12, 0, 0); // April = month 3 (0-indexed)
    const RealDate = Date;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function FrozenDate(this: unknown, ...args: any[]): unknown {
      if (!(this instanceof FrozenDate)) {
        // Date() called without `new` — return a string of the FIXED instant.
        return new RealDate(FIXED_INSTANT_MS).toString();
      }
      if (args.length === 0) {
        return new RealDate(FIXED_INSTANT_MS);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new (RealDate as any)(...args);
    }
    FrozenDate.prototype = RealDate.prototype;
    (FrozenDate as unknown as { now: () => number }).now = () => FIXED_INSTANT_MS;
    (FrozenDate as unknown as { parse: typeof Date.parse }).parse = RealDate.parse;
    (FrozenDate as unknown as { UTC: typeof Date.UTC }).UTC = RealDate.UTC;
    (window as unknown as { Date: unknown }).Date = FrozenDate;

    // performance.now → fixed value relative to navigation start.
    const realPerfNow = performance.now.bind(performance);
    const frozenPerfStart = realPerfNow();
    try {
      Object.defineProperty(performance, "now", {
        configurable: true,
        writable: true,
        value: () => frozenPerfStart,
      });
    } catch {
      // Some browsers make performance.now non-configurable; fallback no-op.
    }
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
  opts?: { skipHeroCascade?: boolean; freezeKeyframes?: boolean; freezeClock?: boolean }
) {
  if (opts?.freezeClock) {
    await freezeClockViaInitScript(page);
  }
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
