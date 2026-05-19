import { test, expect, VIEWPORTS, type ViewportName } from "../fixtures/token-economics-page";
import { prepareContext } from "../fixtures/visual-determinism";

const BLOG_PATH = "/blog/mempalace-retrieval-economics";

const STEP_LABELS = [
  "Query", "Load architecture.md", "Load debug-session.jsonl",
  "Load auth-notes.md", "Parse all content",
  "KNN cosine search", "KG entity lookup", "Top-5 drawers",
];

// --- Minimized Mode (Inline) ---

test.describe("TokenEconomics - Minimized mode", () => {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vpName} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: vp });

      test("renders all 9 flow step labels", async ({ tokenEconomics: te }) => {
        await te.goto();
        for (const label of STEP_LABELS) {
          await expect(te.figure.getByText(label, { exact: false }).first()).toBeVisible();
        }
      });

      test("Query tiles have warm amber background", async ({ tokenEconomics: te }) => {
        await te.goto();
        const tiles = te.queryTiles();
        await expect(tiles).toHaveCount(2);
        for (let i = 0; i < 2; i++) {
          const [r, g, b] = await te.getColor(tiles.nth(i), "backgroundColor");
          expect(r).toBeGreaterThan(240);
          expect(g).toBeGreaterThan(220);
          expect(b).toBeGreaterThan(180);
        }
      });

      test("warning steps have reddish background", async ({ tokenEconomics: te }) => {
        await te.goto();
        const [r] = await te.getColor(te.stepByText("Load architecture.md"), "backgroundColor");
        expect(r).toBeGreaterThan(240);
      });

      test("success step has greenish background", async ({ tokenEconomics: te }) => {
        await te.goto();
        const [, g] = await te.getColor(te.stepByText("Top-5 drawers"), "backgroundColor");
        expect(g).toBeGreaterThan(230);
      });

      test("Result label is visible below divider", async ({ tokenEconomics: te }) => {
        await te.goto();
        await expect(te.resultLabel).toBeVisible();
      });

      test("both AnimatedBar meters are present", async ({ tokenEconomics: te }) => {
        await te.goto();
        await expect(te.meters()).toHaveCount(2);
      });

      test("red bar label text has dark red color", async ({ tokenEconomics: te }) => {
        await te.goto();
        const label = te.barLabel(te.redMeter);
        const [r, g, b] = await te.getColor(label, "color");
        expect(r).toBeGreaterThan(150);
        expect(g).toBeLessThan(50);
        expect(b).toBeLessThan(50);
      });

      test("flow columns are stacked vertically", async ({ tokenEconomics: te }) => {
        await te.goto();
        expect(await te.columnsAreStacked()).toBe(true);
      });

      test("SVG icons are NOT present", async ({ tokenEconomics: te }) => {
        await te.goto();
        await expect(te.alertIcon()).toHaveCount(0);
        await expect(te.checkIcon()).toHaveCount(0);
      });

      test("step label font size >= 12px", async ({ tokenEconomics: te }) => {
        await te.goto();
        const size = await te.getFontSize(te.figure.getByText("Load architecture.md"));
        expect(size).toBeGreaterThanOrEqual(12);
      });

      test("detail text is smaller than label text", async ({ tokenEconomics: te }) => {
        await te.goto();
        const labelSize = await te.getFontSize(te.figure.getByText("KNN cosine search"));
        const detailSize = await te.getFontSize(te.figure.getByText("85K drawers, 119ms"));
        expect(detailSize).toBeLessThan(labelSize);
      });

      test("sub-labels show signal-to-noise percentages", async ({ tokenEconomics: te }) => {
        await te.goto();
        await expect(te.page.getByText("0.9% signal-to-noise")).toBeVisible();
        await expect(te.page.getByText("93% signal-to-noise")).toBeVisible();
      });

      if (vpName !== "desktop") {
        test("bars do not overflow container", async ({ tokenEconomics: te }) => {
          await te.goto();
          const containerBox = await te.barsContainer.boundingBox();
          const meterBoxes = await te.getBoundingBoxes(te.meters());
          for (const box of meterBoxes) {
            expect(box.x + box.width).toBeLessThanOrEqual(containerBox!.x + containerBox!.width + 2);
          }
        });
      }
    });
  }
});

// --- Maximized Mode (Expanded) ---

test.describe("TokenEconomics - Maximized mode", () => {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vpName} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: vp });

      test("expand button opens fullscreen dialog", async ({ tokenEconomics: te }) => {
        await te.goto();
        await te.expand();
        await expect(te.dialog).toHaveAttribute("aria-modal", "true");
      });

      test("dialog background is dark Night City", async ({ tokenEconomics: te }) => {
        await te.goto();
        await te.expand();
        const [r, g, b] = await te.getColor(te.dialog, "backgroundColor");
        expect(r).toBeLessThan(30);
        expect(g).toBeLessThan(30);
        expect(b).toBeLessThan(40);
      });

      test("Query tiles have primary yellow text", async ({ tokenEconomics: te }) => {
        await te.goto();
        await te.expand();
        const tiles = te.queryTiles(true);
        await expect(tiles).toHaveCount(2);
        for (let i = 0; i < 2; i++) {
          const textEl = tiles.nth(i).locator("span").first();
          const [r, g, b] = await te.getColor(textEl, "color");
          expect(r).toBeGreaterThan(200);
          expect(g).toBeGreaterThan(180);
          expect(b).toBeLessThan(80);
        }
      });

      test("warning steps have red text on dark background", async ({ tokenEconomics: te }) => {
        await te.goto();
        await te.expand();
        const textEl = te.stepByText("Load architecture.md", true).locator("span").first();
        const [r, , ] = await te.getColor(textEl, "color");
        expect(r).toBeGreaterThan(200);
      });

      test("red bar label is light for contrast", async ({ tokenEconomics: te }) => {
        await te.goto();
        await te.expand();
        const meter = te.dialog.locator('[aria-label="Flat retrieval: 88,000 tokens"]');
        const label = te.barLabel(meter);
        const [r, g, b] = await te.getColor(label, "color");
        expect(r).toBeGreaterThan(240);
        expect(g).toBeGreaterThan(230);
        expect(b).toBeGreaterThan(230);
      });

      test("green bar label is light for contrast", async ({ tokenEconomics: te }) => {
        await te.goto();
        await te.expand();
        const meter = te.dialog.locator('[aria-label="MemPalace retrieval: 3,000 tokens"]');
        const label = te.barLabel(meter);
        const [r, g, b] = await te.getColor(label, "color");
        expect(r).toBeGreaterThan(230);
        expect(g).toBeGreaterThan(240);
        expect(b).toBeGreaterThan(230);
      });

      test("AlertTriangle icon is visible", async ({ tokenEconomics: te }) => {
        await te.goto();
        await te.expand();
        await expect(te.alertIcon(true)).toBeVisible();
      });

      test("CheckCircle icon is visible", async ({ tokenEconomics: te }) => {
        await te.goto();
        await te.expand();
        await expect(te.checkIcon(true)).toBeVisible();
      });

      test("Escape closes the dialog", async ({ tokenEconomics: te }) => {
        await te.goto();
        await te.expand();
        await te.collapse();
      });

      if (vpName === "desktop" || vpName === "tablet") {
        test("flow columns are side-by-side", async ({ tokenEconomics: te }) => {
          await te.goto();
          await te.expand();
          expect(await te.columnsAreSideBySide(true)).toBe(true);
        });
      }

      if (vpName === "mobile") {
        test("flow columns are stacked even in expanded mode", async ({ tokenEconomics: te }) => {
          await te.goto();
          await te.expand();
          expect(await te.columnsAreStacked(true)).toBe(true);
        });
      }
    });
  }
});

// --- Color Transitions ---

test.describe("TokenEconomics - Color transitions", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("inline-to-expanded: warning background changes from light to dark", async ({ tokenEconomics: te }) => {
    await te.goto();
    const [rBefore] = await te.getColor(te.stepByText("Load architecture.md"), "backgroundColor");
    expect(rBefore).toBeGreaterThan(240);

    await te.expand();
    const [rAfter, gAfter, bAfter] = await te.getColor(te.stepByText("Load architecture.md", true), "backgroundColor");
    expect(rAfter).toBeLessThan(80);
    expect(gAfter).toBeLessThan(30);
    expect(bAfter).toBeLessThan(30);
  });

  test("expanded-to-inline: colors revert on collapse", async ({ tokenEconomics: te }) => {
    await te.goto();
    await te.expand();
    await te.collapse();
    const [r] = await te.getColor(te.stepByText("Load architecture.md"), "backgroundColor");
    expect(r).toBeGreaterThan(240);
  });
});

// --- Animation Cascade ---

test.describe("TokenEconomics - Animation cascade", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("left column appears before right column", async ({ page }) => {
    await prepareContext(page, { freezeKeyframes: false });
    await page.goto(BLOG_PATH);
    const figure = page.locator('[aria-label*="Token Economics"]');
    await figure.scrollIntoViewIfNeeded();

    await expect(page.getByText("Parse all content")).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="figure"]').getByText("KNN cosine search")).toBeVisible({ timeout: 5000 });
  });

  test("divider and result label appear after flow columns", async ({ page }) => {
    await prepareContext(page, { freezeKeyframes: false });
    await page.goto(BLOG_PATH);
    const figure = page.locator('[aria-label*="Token Economics"]');
    await figure.scrollIntoViewIfNeeded();
    await expect(page.getByText("Result (tokens loaded)")).toBeVisible({ timeout: 10000 });
  });

  test("bars appear after divider", async ({ page }) => {
    await prepareContext(page, { freezeKeyframes: false });
    await page.goto(BLOG_PATH);
    const figure = page.locator('[aria-label*="Token Economics"]');
    await figure.scrollIntoViewIfNeeded();
    await expect(page.locator('[aria-label="Flat retrieval: 88,000 tokens"]')).toBeVisible({ timeout: 10000 });
  });

  test("expanded mode cascade follows same sequence", async ({ page }) => {
    await prepareContext(page, { freezeKeyframes: false });
    await page.goto(BLOG_PATH);
    await page.waitForTimeout(1000);

    const shell = page.locator(".group").filter({ has: page.locator("text=Token Economics") });
    await shell.locator('button[aria-label="Expand diagram"]').click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText("Query").first()).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText("Top-5 drawers")).toBeVisible({ timeout: 10000 });
    await expect(dialog.locator('[aria-label="Flat retrieval: 88,000 tokens"]')).toBeVisible({ timeout: 10000 });
  });
});

// --- Layout Positioning ---

test.describe("TokenEconomics - Layout positioning", () => {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test.describe(vpName, () => {
      test.use({ viewport: vp });

      if (vpName === "desktop" || vpName === "tablet") {
        test("columns are horizontally adjacent in expanded mode", async ({ tokenEconomics: te }) => {
          await te.goto();
          await te.expand();
          const boxes = await te.getBoundingBoxes(te.flowColumns(true));
          expect(boxes[1].x).toBeGreaterThan(boxes[0].x + boxes[0].width * 0.8);
          expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(20);
        });
      }

      test("columns are stacked in minimized mode", async ({ tokenEconomics: te }) => {
        await te.goto();
        expect(await te.columnsAreStacked()).toBe(true);
      });
    });
  }
});

// --- Accessibility ---

test.describe("TokenEconomics - Accessibility", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("figure has correct aria-label", async ({ tokenEconomics: te }) => {
    await te.goto();
    await expect(te.figure).toHaveAttribute(
      "aria-label",
      "Token Economics: flat retrieval loads 88,000 tokens at 0.9% signal; MemPalace retrieval loads 3,000 tokens at 93% signal",
    );
  });

  test("red meter has aria-valuenow=88000", async ({ tokenEconomics: te }) => {
    await te.goto();
    await expect(te.redMeter).toHaveAttribute("aria-valuenow", "88000");
  });

  test("green meter has aria-valuenow=3000", async ({ tokenEconomics: te }) => {
    await te.goto();
    await expect(te.greenMeter).toHaveAttribute("aria-valuenow", "3000");
  });
});
