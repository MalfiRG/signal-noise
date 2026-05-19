import { test, expect, VIEWPORTS } from "../fixtures/context-window-scale-page";

const MODEL_NAMES = [
  "Opus 4.6", "Sonnet 4.6", "GPT-4 Turbo",
  "Llama 3.1 70B", "Llama 3.2 8B Q4", "7B 4-bit laptop",
];

test.describe("ContextWindowScale - Minimized mode", () => {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vpName} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: vp });

      test("renders all 7 meters (6 models + MemPalace)", async ({ cws }) => {
        await cws.goto();
        await expect(cws.meters()).toHaveCount(7);
      });

      test("all model name labels are visible", async ({ cws }) => {
        await cws.goto();
        for (const name of MODEL_NAMES) {
          await expect(cws.modelLabel(name)).toBeVisible();
        }
      });

      test("MemPalace label is visible with CheckCircle icon", async ({ cws }) => {
        await cws.goto();
        await expect(cws.mempalaceLabel()).toBeVisible();
        await expect(cws.checkIcon()).toBeVisible();
      });

      test("separator line is visible", async ({ cws }) => {
        await cws.goto();
        await expect(cws.separator).toBeVisible();
      });

      test("MemPalace sub-label shows constant message", async ({ cws }) => {
        await cws.goto();
        await expect(cws.subLabel()).toBeVisible();
      });

      test("model name labels have dark color in inline mode", async ({ cws }) => {
        await cws.goto();
        const label = cws.modelLabel("Opus 4.6");
        const [r, g, b] = await cws.getColor(label, "color");
        expect(r).toBeLessThan(60);
        expect(g).toBeLessThan(50);
        expect(b).toBeLessThan(45);
      });

      test("MemPalace label has cyan color", async ({ cws }) => {
        await cws.goto();
        const label = cws.mempalaceLabel();
        const [r, g, b] = await cws.getColor(label, "color");
        expect(g).toBeGreaterThan(200);
        expect(b).toBeGreaterThan(150);
      });

      test("7B 4-bit laptop bar has dark red color", async ({ cws }) => {
        await cws.goto();
        const meter = cws.page.locator('[aria-label="7B 4-bit laptop: 8,000 tokens"]');
        const barDiv = meter.locator("div.rounded").first();
        const bg = await barDiv.evaluate((e) => getComputedStyle(e).background);
        expect(bg).toContain("102, 0, 0");
      });

      test("no AlertTriangle icon in inline mode", async ({ cws }) => {
        await cws.goto();
        await expect(cws.alertIcon()).toHaveCount(0);
      });
    });
  }
});

test.describe("ContextWindowScale - Maximized mode", () => {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vpName} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: vp });

      test("expand opens fullscreen dialog", async ({ cws }) => {
        await cws.goto();
        await cws.expand();
        await expect(cws.dialog).toHaveAttribute("aria-modal", "true");
      });

      test("dialog background is dark Night City", async ({ cws }) => {
        await cws.goto();
        await cws.expand();
        const [r, g, b] = await cws.getColor(cws.dialog, "backgroundColor");
        expect(r).toBeLessThan(30);
        expect(g).toBeLessThan(30);
        expect(b).toBeLessThan(40);
      });

      test("model name labels have cream-yellow color", async ({ cws }) => {
        await cws.goto();
        await cws.expand();
        const label = cws.modelLabel("Opus 4.6", true);
        const [r, g, b] = await cws.getColor(label, "color");
        expect(r).toBeGreaterThan(220);
        expect(g).toBeGreaterThan(210);
        expect(b).toBeGreaterThan(130);
      });

      test("bar labels have cream-yellow color", async ({ cws }) => {
        await cws.goto();
        await cws.expand();
        const meter = cws.dialog.locator('[aria-label="Opus 4.6: 1,000,000 tokens"]');
        const label = cws.barLabel(meter);
        const [r, g, b] = await cws.getColor(label, "color");
        expect(r).toBeGreaterThan(220);
        expect(g).toBeGreaterThan(210);
        expect(b).toBeGreaterThan(130);
      });

      test("AlertTriangle icon appears on 7B row", async ({ cws }) => {
        await cws.goto();
        await cws.expand();
        const row = cws.modelRow("7B 4-bit laptop", true);
        await expect(row.locator("svg.lucide-triangle-alert")).toBeVisible();
      });

      test("Escape closes the dialog", async ({ cws }) => {
        await cws.goto();
        await cws.expand();
        await cws.collapse();
      });
    });
  }
});

test.describe("ContextWindowScale - Color transitions", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("model labels switch from dark to cream-yellow on expand", async ({ cws }) => {
    await cws.goto();
    const [rBefore] = await cws.getColor(cws.modelLabel("Opus 4.6"), "color");
    expect(rBefore).toBeLessThan(60);

    await cws.expand();
    const [rAfter, gAfter] = await cws.getColor(cws.modelLabel("Opus 4.6", true), "color");
    expect(rAfter).toBeGreaterThan(220);
    expect(gAfter).toBeGreaterThan(210);
  });

  test("colors revert on collapse", async ({ cws }) => {
    await cws.goto();
    await cws.expand();
    await cws.collapse();
    const [r] = await cws.getColor(cws.modelLabel("Opus 4.6"), "color");
    expect(r).toBeLessThan(60);
  });
});

test.describe("ContextWindowScale - Accessibility", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("figure has correct aria-label", async ({ cws }) => {
    await cws.goto();
    await expect(cws.figure).toHaveAttribute(
      "aria-label",
      "Context Window Scale: model context windows range from 1M (Opus) to 8K (7B laptop), while MemPalace retrieval costs 2-5K tokens regardless of model",
    );
  });

  test("Opus meter has aria-valuenow=1000000", async ({ cws }) => {
    await cws.goto();
    const meter = cws.page.locator('[aria-label="Opus 4.6: 1,000,000 tokens"]');
    await expect(meter).toHaveAttribute("aria-valuenow", "1000000");
  });

  test("7B meter has aria-valuenow=8000", async ({ cws }) => {
    await cws.goto();
    const meter = cws.page.locator('[aria-label="7B 4-bit laptop: 8,000 tokens"]');
    await expect(meter).toHaveAttribute("aria-valuenow", "8000");
  });

  test("MemPalace meter has aria-valuenow=3500", async ({ cws }) => {
    await cws.goto();
    const meter = cws.page.locator('[aria-label="MemPalace retrieval: 2-5K tokens regardless of model"]');
    await expect(meter).toHaveAttribute("aria-valuenow", "3500");
  });
});
