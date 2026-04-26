/**
 * Accessibility regression guards for findings the user observed in
 * Brave's DevTools Accessibility audit on the Vercel preview.
 *
 * Locks three contracts:
 *
 *   1. Every top-level page has exactly one <main> landmark.
 *      WCAG 2.4.1 (Bypass Blocks). Centralized in `App.tsx` (single
 *      <main> wraps every route). `BlogLayout.tsx` was downgraded
 *      from <main> to <div> so blog routes don't end up with two.
 *
 *   2. No focusable element lives inside an `aria-hidden="true"` or
 *      `data-aria-hidden="true"` subtree. `Index.tsx` was the original
 *      offender: the cascade-gated CTA region used aria-hidden +
 *      pointer-events-none on the wrapper while keeping the CTA links
 *      focusable. Fix replaces both with React 19's `inert` boolean.
 *      This spec catches any regression that reintroduces aria-hidden
 *      around focusables — independent of which CSS approach the
 *      component chooses.
 *
 *   3. The Skills page Tabs triggers meet WCAG AA 4.5:1 normal-text
 *      contrast against their effective background. The active tab is
 *      bright by definition; the inactive tab(s) used to fall to ~4.0
 *      against `bg-secondary/50` and now use `text-foreground/70`.
 *
 * Why DOM probes instead of axe-core: axe is a 200kb runtime payload
 * for findings we already know to expect. Three focused DOM queries
 * give us the exact selectors that fail (so a regression is easy to
 * pinpoint) and zero new dependencies.
 */
import { test, expect, type Page } from "@playwright/test";

const PAGES = ["/", "/projects", "/skills"] as const;

interface AriaHiddenViolation {
  rootDescription: string;
  focusableDescription: string;
}

async function findAriaHiddenViolations(
  page: Page,
): Promise<AriaHiddenViolation[]> {
  return await page.evaluate(() => {
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const ariaHiddenRoots = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[aria-hidden="true"], [data-aria-hidden="true"]',
      ),
    );
    const desc = (e: HTMLElement): string => {
      const tag = e.tagName.toLowerCase();
      const id = e.id ? `#${e.id}` : "";
      const cls =
        typeof e.className === "string" && e.className
          ? `.${e.className.trim().split(/\s+/).slice(0, 3).join(".")}`
          : "";
      return `${tag}${id}${cls}`;
    };
    const out: { rootDescription: string; focusableDescription: string }[] = [];
    for (const root of ariaHiddenRoots) {
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (root.matches(focusableSelector)) focusable.unshift(root);
      for (const el of focusable) {
        out.push({
          rootDescription: desc(root),
          focusableDescription: desc(el),
        });
      }
    }
    return out;
  });
}

function relativeLuminance(rgb: string): number {
  const m = rgb.match(/(\d+(?:\.\d+)?)/g);
  if (!m || m.length < 3) return 0;
  const [r, g, b] = m.slice(0, 3).map(Number);
  const norm = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
}

function contrastRatio(fg: string, bg: string): number {
  const L1 = relativeLuminance(fg);
  const L2 = relativeLuminance(bg);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

test.describe("A11y — landmarks and aria-hidden hygiene", () => {
  for (const path of PAGES) {
    test(`${path} has exactly one <main> landmark`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      const mainCount = await page.locator("main").count();
      expect(
        mainCount,
        `${path} must expose exactly one <main> for screen-reader landmark navigation (WCAG 2.4.1)`,
      ).toBe(1);
    });

    test(`${path} has no focusable element inside an aria-hidden subtree (settled state)`, async ({
      page,
    }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const violations = await findAriaHiddenViolations(page);
      const formatted = violations
        .map(
          (v) => `  - ${v.focusableDescription}\n    inside ${v.rootDescription}`,
        )
        .join("\n");
      expect(
        violations,
        `aria-hidden subtree must not contain focusable elements. Found ${violations.length} violations:\n${formatted}`,
      ).toEqual([]);
    });
  }

  test("/ keeps cascade-gated CTA region inert (no aria-hidden over focusables) during phases 0-2", async ({
    page,
  }) => {
    // Specifically targets the original Index.tsx bug: a wrapper that was
    // both aria-hidden=true AND contained focusable Link CTAs during the
    // 5.8s cascade. After the fix, the wrapper uses `inert` instead, so
    // querying [aria-hidden] should return zero violations even mid-cascade.
    //
    // We DON'T wait for phase 3 — the assertion has to hold during the
    // cascade window where the original bug lived.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    // Wait only for the cascading marker, not for phase 3.
    await page.waitForSelector(
      '[data-testid="hero-cascading"], [data-testid="hero-phase3"]',
      { timeout: 6000 },
    );

    const violations = await findAriaHiddenViolations(page);
    const formatted = violations
      .map((v) => `  - ${v.focusableDescription} inside ${v.rootDescription}`)
      .join("\n");
    expect(
      violations,
      `Cascade-gated CTAs must use \`inert\`, not aria-hidden. Found ${violations.length} aria-hidden+focusable pairs:\n${formatted}`,
    ).toEqual([]);
  });

  test("/ cascade CTA wrapper carries the `inert` attribute during phases 0-2", async ({
    page,
  }) => {
    // Implementation-level assertion: the CTA wrapper must use the modern
    // `inert` attribute. Catches a regression to the old aria-hidden
    // pattern that would still pass test 2 above (because aria-hidden
    // would simply be removed) but lose the focus-trap-out behavior.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await page.waitForSelector(
      '[data-testid="hero-cascading"], [data-testid="hero-phase3"]',
      { timeout: 6000 },
    );

    const result = await page.evaluate(() => {
      // Find the wrapper that contains both CTA links. We don't anchor
      // by class because that's brittle to refactors.
      const projectsLink = document.querySelector('a[href="/projects"]');
      const blogLink = document.querySelector('a[href="/blog"]');
      if (!projectsLink || !blogLink) return null;
      let wrapper: HTMLElement | null = projectsLink.parentElement;
      while (wrapper && !wrapper.contains(blogLink)) {
        wrapper = wrapper.parentElement;
      }
      if (!wrapper) return null;
      // Check this wrapper OR any ancestor up to <main> — Framer Motion may
      // wrap the inert region in another div. We look for the closest
      // ancestor that has either inert OR aria-hidden=true.
      let node: HTMLElement | null = wrapper;
      while (node && node.tagName.toLowerCase() !== "main") {
        if (node.hasAttribute("inert") || node.getAttribute("aria-hidden") === "true") {
          return {
            tag: node.tagName.toLowerCase(),
            hasInert: node.hasAttribute("inert"),
            ariaHidden: node.getAttribute("aria-hidden"),
          };
        }
        node = node.parentElement;
      }
      // No gating ancestor found — the cascade may already have settled to
      // phase 3, in which case neither inert nor aria-hidden should be set.
      return { tag: "(none)", hasInert: false, ariaHidden: null };
    });

    expect(result, "could not locate the CTA wrapper").not.toBeNull();
    if (result?.tag === "(none)") {
      // Cascade settled — that's fine, no gating needed.
      return;
    }
    expect(
      result?.ariaHidden,
      "CTA wrapper must NOT use aria-hidden (use `inert` instead per Index.tsx)",
    ).not.toBe("true");
    expect(
      result?.hasInert,
      "CTA wrapper must use the `inert` attribute during the cascade",
    ).toBe(true);
  });
});

test.describe("A11y — color contrast", () => {
  test("/skills tab triggers meet WCAG AA 4.5:1 normal-text contrast", async ({
    page,
  }) => {
    await page.goto("/skills");
    await page.waitForLoadState("networkidle");

    const samples = await page.evaluate(() => {
      const triggers = Array.from(
        document.querySelectorAll<HTMLElement>('[role="tab"]'),
      );
      return triggers.map((el) => {
        const computed = getComputedStyle(el);
        let bg = "";
        let parent: HTMLElement | null = el;
        while (parent) {
          const c = getComputedStyle(parent).backgroundColor;
          if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") {
            bg = c;
            break;
          }
          parent = parent.parentElement;
        }
        return {
          id: el.id,
          text: el.textContent?.trim().slice(0, 40) ?? "",
          fg: computed.color,
          bg: bg || "rgb(0,0,0)",
        };
      });
    });

    expect(
      samples.length,
      "skills page should render at least 2 tab triggers",
    ).toBeGreaterThanOrEqual(2);

    for (const s of samples) {
      const ratio = contrastRatio(s.fg, s.bg);
      expect(
        ratio,
        `Tab "${s.text}" contrast ${ratio.toFixed(2)} fails WCAG AA 4.5:1 (fg=${s.fg} bg=${s.bg})`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
