import { test, expect, VIEWPORTS } from "../fixtures/latency-tax-page";

test.describe("LatencyTax - Minimized mode", () => {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vpName} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: vp });

      test("both latency meters are present", async ({ lt }) => {
        await lt.goto();
        await expect(lt.meters()).toHaveCount(2);
      });

      test("HNSW label has red color", async ({ lt }) => {
        await lt.goto();
        const [r, g, b] = await lt.getColor(lt.hnswLabel(), "color");
        expect(r).toBeGreaterThan(200);
        expect(g).toBeLessThan(80);
        expect(b).toBeLessThan(80);
      });

      test("sqlite-vec label has green color", async ({ lt }) => {
        await lt.goto();
        const [r, g, b] = await lt.getColor(lt.sqliteLabel(), "color");
        expect(g).toBeGreaterThan(90);
        expect(r).toBeLessThan(30);
      });

      test("faster badge is visible on HNSW row", async ({ lt }) => {
        await lt.goto();
        await expect(lt.badge("faster")).toBeVisible();
      });

      test("slower badge is visible on sqlite-vec row", async ({ lt }) => {
        await lt.goto();
        await expect(lt.badge("slower")).toBeVisible();
      });

      test("hit rate 40% is visible", async ({ lt }) => {
        await lt.goto();
        await expect(lt.hitRateValue("40%")).toBeVisible();
      });

      test("hit rate 100% is visible", async ({ lt }) => {
        await lt.goto();
        await expect(lt.hitRateValue("100%")).toBeVisible();
      });

      test("HNSW hit rate has red color", async ({ lt }) => {
        await lt.goto();
        const el = lt.hitRateValue("40%");
        const [r, g, b] = await lt.getColor(el, "color");
        expect(r).toBeGreaterThan(140);
        expect(g).toBeLessThan(40);
        expect(b).toBeLessThan(40);
      });

      test("sqlite-vec hit rate has green color", async ({ lt }) => {
        await lt.goto();
        const el = lt.hitRateValue("100%");
        const [r, g, b] = await lt.getColor(el, "color");
        expect(g).toBeGreaterThan(80);
        expect(r).toBeLessThan(30);
      });

      test("verdict line is visible", async ({ lt }) => {
        await lt.goto();
        await expect(lt.verdictLine).toBeVisible();
      });

      test("section headers are visible", async ({ lt }) => {
        await lt.goto();
        await expect(lt.sectionHeader("QUERY LATENCY")).toBeVisible();
        await expect(lt.sectionHeader("HIT RATE")).toBeVisible();
      });

      test("sub-labels show approximate and exact", async ({ lt }) => {
        await lt.goto();
        await expect(lt.page.getByText("(approximate)")).toBeVisible();
        await expect(lt.page.getByText("(exact)")).toBeVisible();
      });

      test("data loss and divergence labels visible", async ({ lt }) => {
        await lt.goto();
        await expect(lt.figure.getByText("17.2% data loss")).toBeVisible();
        await expect(lt.figure.getByText("zero divergence")).toBeVisible();
      });

      test("no icons in inline mode", async ({ lt }) => {
        await lt.goto();
        await expect(lt.alertIcon()).toHaveCount(0);
        await expect(lt.checkIcon()).toHaveCount(0);
      });
    });
  }
});

test.describe("LatencyTax - Maximized mode", () => {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vpName} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: vp });

      test("expand opens fullscreen dialog", async ({ lt }) => {
        await lt.goto();
        await lt.expand();
        await expect(lt.dialog).toHaveAttribute("aria-modal", "true");
      });

      test("dialog background is dark Night City", async ({ lt }) => {
        await lt.goto();
        await lt.expand();
        const [r, g, b] = await lt.getColor(lt.dialog, "backgroundColor");
        expect(r).toBeLessThan(30);
        expect(g).toBeLessThan(30);
        expect(b).toBeLessThan(40);
      });

      test("AlertTriangle icon visible on HNSW row", async ({ lt }) => {
        await lt.goto();
        await lt.expand();
        await expect(lt.alertIcon(true)).toBeVisible();
      });

      test("CheckCircle icon visible on sqlite-vec row", async ({ lt }) => {
        await lt.goto();
        await lt.expand();
        await expect(lt.checkIcon(true)).toBeVisible();
      });

      test("HNSW label has lighter red in expanded", async ({ lt }) => {
        await lt.goto();
        await lt.expand();
        const [r] = await lt.getColor(lt.hnswLabel(true), "color");
        expect(r).toBeGreaterThan(220);
      });

      test("sqlite-vec label has lighter green in expanded", async ({ lt }) => {
        await lt.goto();
        await lt.expand();
        const [, g] = await lt.getColor(lt.sqliteLabel(true), "color");
        expect(g).toBeGreaterThan(200);
      });

      test("hit rate 40% has lighter red in expanded", async ({ lt }) => {
        await lt.goto();
        await lt.expand();
        const el = lt.hitRateValue("40%", true);
        const [r] = await lt.getColor(el, "color");
        expect(r).toBeGreaterThan(220);
      });

      test("hit rate 100% has lighter green in expanded", async ({ lt }) => {
        await lt.goto();
        await lt.expand();
        const el = lt.hitRateValue("100%", true);
        const [, g] = await lt.getColor(el, "color");
        expect(g).toBeGreaterThan(200);
      });

      test("Escape closes the dialog", async ({ lt }) => {
        await lt.goto();
        await lt.expand();
        await lt.collapse();
      });
    });
  }
});

test.describe("LatencyTax - Color transitions", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("HNSW label darkens on collapse", async ({ lt }) => {
    await lt.goto();
    await lt.expand();
    const [rExpanded] = await lt.getColor(lt.hnswLabel(true), "color");
    expect(rExpanded).toBeGreaterThan(220);

    await lt.collapse();
    const [rInline] = await lt.getColor(lt.hnswLabel(), "color");
    expect(rInline).toBeLessThan(rExpanded);
  });
});

test.describe("LatencyTax - Accessibility", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("figure has correct aria-label", async ({ lt }) => {
    await lt.goto();
    await expect(lt.figure).toHaveAttribute(
      "aria-label",
      "The Latency Tax: HNSW queries at 80ms with 40% hit rate vs sqlite-vec at 119ms with 100% hit rate. 39ms buys 100% correctness",
    );
  });

  test("HNSW meter has aria-valuenow=80", async ({ lt }) => {
    await lt.goto();
    await expect(lt.hnswMeter).toHaveAttribute("aria-valuenow", "80");
  });

  test("sqlite-vec meter has aria-valuenow=119", async ({ lt }) => {
    await lt.goto();
    await expect(lt.sqliteMeter).toHaveAttribute("aria-valuenow", "119");
  });

  test("hit rate values have sr-only text", async ({ lt }) => {
    await lt.goto();
    await expect(lt.page.locator("text=HNSW hit rate: 40%")).toBeAttached();
    await expect(lt.page.locator("text=sqlite-vec hit rate: 100%")).toBeAttached();
  });
});
