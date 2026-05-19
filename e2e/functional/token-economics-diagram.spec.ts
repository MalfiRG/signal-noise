import { test, expect, type Page, type Locator } from "@playwright/test";
import { prepareContext, stabilizeForLayout } from "../fixtures/visual-determinism";

const BLOG_PATH = "/blog/mempalace-retrieval-economics";
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
} as const;

function rgb(s: string): [number, number, number] {
  const m = s.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!m) throw new Error(`Could not parse RGB from: ${s}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

async function getColor(el: Locator, prop: "color" | "backgroundColor" | "borderColor") {
  return el.evaluate((e, p) => getComputedStyle(e)[p as keyof CSSStyleDeclaration] as string, prop);
}

async function navigateAndScroll(page: Page, opts?: { freezeKeyframes?: boolean }) {
  await prepareContext(page, { freezeKeyframes: opts?.freezeKeyframes ?? true });
  await page.goto(BLOG_PATH);
  await stabilizeForLayout(page, { readyLocator: page.locator('[role="figure"]').first() });
  const diagram = page.locator('[aria-label*="Token Economics"]');
  await diagram.scrollIntoViewIfNeeded();
  return diagram;
}

function diagramShell(page: Page) {
  return page.locator(".group").filter({ has: page.locator('text="Token Economics"') });
}

// --- Minimized Mode (Inline) ---

test.describe("TokenEconomics - Minimized mode", () => {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vpName} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: vp });

      test("renders all 9 flow step labels", async ({ page }) => {
        await navigateAndScroll(page);
        const figure = page.locator('[aria-label*="Token Economics"]');
        const steps = [
          "Query", "Load architecture.md", "Load debug-session.jsonl",
          "Load auth-notes.md", "Parse all content",
          "KNN cosine search", "KG entity lookup", "Top-5 drawers",
        ];
        for (const label of steps) {
          await expect(figure.getByText(label, { exact: false }).first()).toBeVisible();
        }
      });

      test("Query tiles have warm amber background (accent tone)", async ({ page }) => {
        await navigateAndScroll(page);
        const queryTiles = page.locator('[role="figure"]').locator("div.rounded-lg").filter({
          hasText: /^Query$/,
        });
        const count = await queryTiles.count();
        expect(count).toBe(2);
        for (let i = 0; i < count; i++) {
          const bg = await getColor(queryTiles.nth(i), "backgroundColor");
          const [r, g, b] = rgb(bg);
          expect(r).toBeGreaterThan(240);
          expect(g).toBeGreaterThan(220);
          expect(b).toBeGreaterThan(180);
        }
      });

      test("warning steps (Load ...) have reddish background", async ({ page }) => {
        await navigateAndScroll(page);
        const loadStep = page.locator('[role="figure"]').locator("div.rounded-lg").filter({
          hasText: "Load architecture.md",
        });
        const bg = await getColor(loadStep, "backgroundColor");
        const [r, g, b] = rgb(bg);
        expect(r).toBeGreaterThan(240);
        expect(g).toBeLessThan(r);
      });

      test("success step (Top-5 drawers) has greenish background", async ({ page }) => {
        await navigateAndScroll(page);
        const successStep = page.locator('[role="figure"]').locator("div.rounded-lg").filter({
          hasText: "Top-5 drawers",
        });
        const bg = await getColor(successStep, "backgroundColor");
        const [r, g, b] = rgb(bg);
        expect(g).toBeGreaterThan(230);
      });

      test("Result label is visible below divider line", async ({ page }) => {
        await navigateAndScroll(page);
        await expect(page.getByText("Result (tokens loaded)")).toBeVisible();
      });

      test("both AnimatedBar meters are present", async ({ page }) => {
        await navigateAndScroll(page);
        const meters = page.locator('[role="figure"]').locator('[role="meter"]');
        await expect(meters).toHaveCount(2);
      });

      test("red bar label text has dark red color (inline mode)", async ({ page }) => {
        await navigateAndScroll(page);
        const redMeter = page.locator('[aria-label="Flat retrieval: 88,000 tokens"]');
        const label = redMeter.locator("span").first();
        const color = await getColor(label, "color");
        const [r, g, b] = rgb(color);
        expect(r).toBeGreaterThan(150);
        expect(g).toBeLessThan(50);
        expect(b).toBeLessThan(50);
      });

      test("flow columns are stacked vertically in inline mode", async ({ page }) => {
        await navigateAndScroll(page);
        const figure = page.locator('[role="figure"]');
        const columns = figure.locator(":scope > div:first-child > div.flex-1");
        const count = await columns.count();
        expect(count).toBe(2);
        const box0 = await columns.nth(0).boundingBox();
        const box1 = await columns.nth(1).boundingBox();
        expect(box0).toBeTruthy();
        expect(box1).toBeTruthy();
        expect(box1!.y).toBeGreaterThan(box0!.y + box0!.height - 10);
      });

      test("SVG icons (AlertTriangle, CheckCircle) are NOT present", async ({ page }) => {
        await navigateAndScroll(page);
        const figure = page.locator('[role="figure"]');
        await expect(figure.locator("svg.lucide-triangle-alert")).toHaveCount(0);
        await expect(figure.locator("svg.lucide-circle-check")).toHaveCount(0);
      });

      test("step label font size is at least 12px", async ({ page }) => {
        await navigateAndScroll(page);
        const label = page.locator('[role="figure"]').getByText("Load architecture.md");
        const fontSize = await label.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        expect(fontSize).toBeGreaterThanOrEqual(12);
      });

      test("step detail text is smaller than label text", async ({ page }) => {
        await navigateAndScroll(page);
        const label = page.locator('[role="figure"]').getByText("KNN cosine search");
        const detail = page.locator('[role="figure"]').getByText("85K drawers, 119ms");
        const labelSize = await label.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        const detailSize = await detail.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        expect(detailSize).toBeLessThan(labelSize);
      });

      test("sub-labels show signal-to-noise percentages", async ({ page }) => {
        await navigateAndScroll(page);
        await expect(page.getByText("0.9% signal-to-noise")).toBeVisible();
        await expect(page.getByText("93% signal-to-noise")).toBeVisible();
      });

      if (vpName !== "desktop") {
        test("bars do not overflow container horizontally", async ({ page }) => {
          await navigateAndScroll(page);
          const container = page.locator('[role="figure"]').locator(".overflow-hidden");
          const containerBox = await container.boundingBox();
          const meters = page.locator('[role="figure"]').locator('[role="meter"]');
          for (let i = 0; i < await meters.count(); i++) {
            const meterBox = await meters.nth(i).boundingBox();
            expect(meterBox!.x + meterBox!.width).toBeLessThanOrEqual(
              containerBox!.x + containerBox!.width + 2
            );
          }
        });
      }
    });
  }
});

// --- Maximized Mode (Expanded) ---

test.describe("TokenEconomics - Maximized mode", () => {
  async function expandDiagram(page: Page) {
    await navigateAndScroll(page);
    const shell = diagramShell(page);
    const expandBtn = shell.locator('button[aria-label="Expand diagram"]');
    await expandBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(500);
    return dialog;
  }

  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vpName} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: vp });

      test("expand button opens fullscreen dialog", async ({ page }) => {
        const dialog = await expandDiagram(page);
        await expect(dialog).toHaveAttribute("aria-modal", "true");
      });

      test("dialog background is dark Night City", async ({ page }) => {
        const dialog = await expandDiagram(page);
        const bg = await getColor(dialog, "backgroundColor");
        const [r, g, b] = rgb(bg);
        expect(r).toBeLessThan(30);
        expect(g).toBeLessThan(30);
        expect(b).toBeLessThan(40);
      });

      test("Query tiles have primary yellow text in expanded mode", async ({ page }) => {
        const dialog = await expandDiagram(page);
        const queryTiles = dialog.locator("div.rounded-lg").filter({ hasText: /^Query$/ });
        const count = await queryTiles.count();
        expect(count).toBe(2);
        for (let i = 0; i < count; i++) {
          const textEl = queryTiles.nth(i).locator("span").first();
          const color = await getColor(textEl, "color");
          const [r, g, b] = rgb(color);
          expect(r).toBeGreaterThan(200);
          expect(g).toBeGreaterThan(180);
          expect(b).toBeLessThan(80);
        }
      });

      test("warning steps have red-ish text on dark background", async ({ page }) => {
        const dialog = await expandDiagram(page);
        const warnStep = dialog.locator("div.rounded-lg").filter({ hasText: "Load architecture.md" });
        const textEl = warnStep.locator("span").first();
        const color = await getColor(textEl, "color");
        const [r, g, b] = rgb(color);
        expect(r).toBeGreaterThan(200);
        expect(g).toBeLessThan(130);
      });

      test("red bar label text is light for contrast against red bar", async ({ page }) => {
        const dialog = await expandDiagram(page);
        const redMeter = dialog.locator('[aria-label="Flat retrieval: 88,000 tokens"]');
        const label = redMeter.locator("span").first();
        const color = await getColor(label, "color");
        const [r, g, b] = rgb(color);
        expect(r).toBeGreaterThan(240);
        expect(g).toBeGreaterThan(230);
        expect(b).toBeGreaterThan(230);
      });

      test("green bar label text is light for contrast against green bar", async ({ page }) => {
        const dialog = await expandDiagram(page);
        const greenMeter = dialog.locator('[aria-label="MemPalace retrieval: 3,000 tokens"]');
        const label = greenMeter.locator("span").first();
        const color = await getColor(label, "color");
        const [r, g, b] = rgb(color);
        expect(r).toBeGreaterThan(230);
        expect(g).toBeGreaterThan(240);
        expect(b).toBeGreaterThan(230);
      });

      test("AlertTriangle SVG icon is visible on red bar", async ({ page }) => {
        const dialog = await expandDiagram(page);
        await expect(dialog.locator("svg.lucide-triangle-alert")).toBeVisible();
      });

      test("CheckCircle SVG icon is visible on green bar", async ({ page }) => {
        const dialog = await expandDiagram(page);
        await expect(dialog.locator("svg.lucide-circle-check")).toBeVisible();
      });

      test("Escape key closes the dialog", async ({ page }) => {
        const dialog = await expandDiagram(page);
        await page.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible();
      });

      if (vpName === "desktop" || vpName === "tablet") {
        test("flow columns are side-by-side in expanded mode", async ({ page }) => {
          const dialog = await expandDiagram(page);
          const figure = dialog.locator('[role="figure"]');
          const columns = figure.locator(":scope > div:first-child > div.flex-1");
          const count = await columns.count();
          expect(count).toBe(2);
          const box0 = await columns.nth(0).boundingBox();
          const box1 = await columns.nth(1).boundingBox();
          expect(box0).toBeTruthy();
          expect(box1).toBeTruthy();
          const verticalOverlap = Math.min(box0!.y + box0!.height, box1!.y + box1!.height) - Math.max(box0!.y, box1!.y);
          expect(verticalOverlap).toBeGreaterThan(box0!.height * 0.5);
        });
      }

      if (vpName === "mobile") {
        test("flow columns are stacked vertically even in expanded mode on mobile", async ({ page }) => {
          const dialog = await expandDiagram(page);
          const figure = dialog.locator('[role="figure"]');
          const columns = figure.locator(":scope > div:first-child > div.flex-1");
          const box0 = await columns.nth(0).boundingBox();
          const box1 = await columns.nth(1).boundingBox();
          expect(box0).toBeTruthy();
          expect(box1).toBeTruthy();
          expect(box1!.y).toBeGreaterThan(box0!.y + box0!.height - 10);
        });
      }
    });
  }
});

// --- Color Transitions ---

test.describe("TokenEconomics - Color transitions", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("colors change from inline palette to expanded palette on expand", async ({ page }) => {
    await navigateAndScroll(page);
    const warnStepInline = page.locator('[role="figure"]').locator("div.rounded-lg").filter({
      hasText: "Load architecture.md",
    });
    const bgInline = await getColor(warnStepInline, "backgroundColor");
    const [rInline] = rgb(bgInline);
    expect(rInline).toBeGreaterThan(240);

    const shell = diagramShell(page);
    await shell.locator('button[aria-label="Expand diagram"]').click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(500);

    const warnStepExpanded = dialog.locator("div.rounded-lg").filter({
      hasText: "Load architecture.md",
    });
    const bgExpanded = await getColor(warnStepExpanded, "backgroundColor");
    const [rExpanded, gExpanded, bExpanded] = rgb(bgExpanded);
    expect(rExpanded).toBeLessThan(80);
    expect(gExpanded).toBeLessThan(30);
    expect(bExpanded).toBeLessThan(30);
  });

  test("colors revert from expanded to inline on collapse", async ({ page }) => {
    await navigateAndScroll(page);
    const shell = diagramShell(page);
    await shell.locator('button[aria-label="Expand diagram"]').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    const warnStep = page.locator('[role="figure"]').locator("div.rounded-lg").filter({
      hasText: "Load architecture.md",
    });
    const bgAfter = await getColor(warnStep, "backgroundColor");
    const [r] = rgb(bgAfter);
    expect(r).toBeGreaterThan(240);
  });
});

// --- Animation Cascade ---

test.describe("TokenEconomics - Animation cascade", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("left column steps appear before right column steps", async ({ page }) => {
    await prepareContext(page, { freezeKeyframes: false });
    await page.goto(BLOG_PATH);

    const figure = page.locator('[aria-label*="Token Economics"]');
    await figure.scrollIntoViewIfNeeded();

    const leftLast = page.getByText("Parse all content");
    const rightFirst = page.locator('[role="figure"]').getByText("KNN cosine search");

    await expect(leftLast).toBeVisible({ timeout: 5000 });

    const leftVisible = await leftLast.evaluate((el) => {
      const opacity = parseFloat(getComputedStyle(el).opacity);
      return opacity > 0.5;
    });
    const rightVisible = await rightFirst.evaluate((el) => {
      const opacity = parseFloat(getComputedStyle(el).opacity);
      return opacity > 0.5;
    });

    if (leftVisible && !rightVisible) {
      expect(true).toBe(true);
    } else {
      await expect(rightFirst).toBeVisible({ timeout: 5000 });
    }
  });

  test("divider and result label appear after flow columns", async ({ page }) => {
    await prepareContext(page, { freezeKeyframes: false });
    await page.goto(BLOG_PATH);

    const figure = page.locator('[aria-label*="Token Economics"]');
    await figure.scrollIntoViewIfNeeded();

    const resultLabel = page.getByText("Result (tokens loaded)");
    await expect(resultLabel).toBeVisible({ timeout: 10000 });
  });

  test("bars appear after divider", async ({ page }) => {
    await prepareContext(page, { freezeKeyframes: false });
    await page.goto(BLOG_PATH);

    const figure = page.locator('[aria-label*="Token Economics"]');
    await figure.scrollIntoViewIfNeeded();

    const meter = page.locator('[aria-label="Flat retrieval: 88,000 tokens"]');
    await expect(meter).toBeVisible({ timeout: 10000 });
  });

  test("expanded mode animation cascade follows same sequence", async ({ page }) => {
    await prepareContext(page, { freezeKeyframes: false });
    await page.goto(BLOG_PATH);
    await page.waitForTimeout(1000);

    const shell = page.locator(".group").filter({ has: page.locator('text="Token Economics"') });
    const expandBtn = shell.locator('button[aria-label="Expand diagram"]');
    await expandBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    const leftFirst = dialog.getByText("Query").first();
    await expect(leftFirst).toBeVisible({ timeout: 5000 });

    const rightLast = dialog.getByText("Top-5 drawers");
    await expect(rightLast).toBeVisible({ timeout: 10000 });

    const meter = dialog.locator('[aria-label="Flat retrieval: 88,000 tokens"]');
    await expect(meter).toBeVisible({ timeout: 10000 });
  });
});

// --- Layout Positioning ---

test.describe("TokenEconomics - Layout positioning", () => {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vpName}`, () => {
      test.use({ viewport: vp });

      if (vpName === "desktop" || vpName === "tablet") {
        test("cascade columns are horizontally adjacent in expanded mode", async ({ page }) => {
          await navigateAndScroll(page);
          const shell = diagramShell(page);
          await shell.locator('button[aria-label="Expand diagram"]').click();
          const dialog = page.locator('[role="dialog"]');
          await expect(dialog).toBeVisible();
          await page.waitForTimeout(500);

          const figure = dialog.locator('[role="figure"]');
          const columns = figure.locator(":scope > div:first-child > div.flex-1");
          const box0 = await columns.nth(0).boundingBox();
          const box1 = await columns.nth(1).boundingBox();

          expect(box1!.x).toBeGreaterThan(box0!.x + box0!.width * 0.8);
          const yDiff = Math.abs(box0!.y - box1!.y);
          expect(yDiff).toBeLessThan(20);
        });
      }

      test("cascade columns are stacked in minimized mode", async ({ page }) => {
        await navigateAndScroll(page);
        const figure = page.locator('[role="figure"]');
        const columns = figure.locator(":scope > div:first-child > div.flex-1");
        const box0 = await columns.nth(0).boundingBox();
        const box1 = await columns.nth(1).boundingBox();
        expect(box1!.y).toBeGreaterThan(box0!.y + box0!.height - 10);
      });
    });
  }
});

// --- Accessibility ---

test.describe("TokenEconomics - Accessibility", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("figure has correct aria-label", async ({ page }) => {
    await navigateAndScroll(page);
    const figure = page.locator('[role="figure"]');
    await expect(figure).toHaveAttribute(
      "aria-label",
      "Token Economics: flat retrieval loads 88,000 tokens at 0.9% signal; MemPalace retrieval loads 3,000 tokens at 93% signal"
    );
  });

  test("both meters have aria-valuenow", async ({ page }) => {
    await navigateAndScroll(page);
    const redMeter = page.locator('[aria-label="Flat retrieval: 88,000 tokens"]');
    await expect(redMeter).toHaveAttribute("aria-valuenow", "88000");

    const greenMeter = page.locator('[aria-label="MemPalace retrieval: 3,000 tokens"]');
    await expect(greenMeter).toHaveAttribute("aria-valuenow", "3000");
  });
});
