import { test, expect, VIEWPORTS } from "../fixtures/dual-write-page";

test.describe("DualWrite - Minimized mode", () => {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vpName} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: vp });

      test("BROKEN header is visible", async ({ dw }) => {
        await dw.goto();
        await expect(dw.header("broken")).toBeVisible();
      });

      test("FIXED header is visible", async ({ dw }) => {
        await dw.goto();
        await expect(dw.header("fixed")).toBeVisible();
      });

      test("all broken steps are visible", async ({ dw }) => {
        await dw.goto();
        await expect(dw.stepBox("collection.add()").first()).toBeVisible();
        await expect(dw.stepBox("SIGTERM")).toBeVisible();
      });

      test("DIVERGED badge is visible", async ({ dw }) => {
        await dw.goto();
        await expect(dw.badge("DIVERGED")).toBeVisible();
      });

      test("ZERO DIVERGENCE badge is visible", async ({ dw }) => {
        await dw.goto();
        await expect(dw.badge("ZERO DIVERGENCE")).toBeVisible();
      });

      test("broken counter shows diverged values", async ({ dw }) => {
        await dw.goto();
        const counter = dw.counterText("broken");
        await expect(counter).toContainText("102,568");
        await expect(counter).toContainText("84,965");
      });

      test("fixed counter shows equal values", async ({ dw }) => {
        await dw.goto();
        const counter = dw.counterText("fixed");
        await expect(counter).toContainText("85,033");
      });
    });
  }
});

test.describe("DualWrite - Animation cascade", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("broken panel reaches done stage", async ({ dw }) => {
    await dw.goto({ freezeKeyframes: false });
    const broken = dw.panelStage("broken");
    await expect(broken).toHaveAttribute("data-stage", "done", { timeout: 10000 });
  });

  test("fixed panel reaches done stage after broken", async ({ dw }) => {
    await dw.goto({ freezeKeyframes: false });
    const fixed = dw.panelStage("fixed");
    await expect(fixed).toHaveAttribute("data-stage", "done", { timeout: 15000 });
  });

  test("broken starts before fixed", async ({ dw }) => {
    await dw.goto({ freezeKeyframes: false });
    const broken = dw.panelStage("broken");
    const fixed = dw.panelStage("fixed");
    await expect(broken).toHaveAttribute("data-stage", "steps", { timeout: 5000 });
    const fixedStage = await fixed.getAttribute("data-stage");
    expect(fixedStage).toBe("hidden");
  });
});

test.describe("DualWrite - Colors (reading mode)", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("BROKEN header has red text", async ({ dw }) => {
    await dw.goto();
    const [r, g, b] = await dw.getColor(dw.header("broken"), "color");
    expect(r).toBeGreaterThan(140);
    expect(g).toBeLessThan(40);
    expect(b).toBeLessThan(40);
  });

  test("FIXED header has green text", async ({ dw }) => {
    await dw.goto();
    const [r, g, b] = await dw.getColor(dw.header("fixed"), "color");
    expect(g).toBeGreaterThan(90);
    expect(r).toBeLessThan(40);
  });

  test("DIVERGED counter has red color", async ({ dw }) => {
    await dw.goto();
    const [r] = await dw.getColor(dw.counterText("broken"), "color");
    expect(r).toBeGreaterThan(140);
  });

  test("ZERO DIVERGENCE counter has green color", async ({ dw }) => {
    await dw.goto();
    const [, g] = await dw.getColor(dw.counterText("fixed"), "color");
    expect(g).toBeGreaterThan(90);
  });
});

test.describe("DualWrite - Maximized mode", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("expand opens fullscreen dialog", async ({ dw }) => {
    await dw.goto();
    await dw.expand();
    await expect(dw.dialog).toHaveAttribute("aria-modal", "true");
  });

  test("dialog background is dark Night City", async ({ dw }) => {
    await dw.goto();
    await dw.expand();
    const [r, g, b] = await dw.getColor(dw.dialog, "backgroundColor");
    expect(r).toBeLessThan(30);
    expect(g).toBeLessThan(30);
    expect(b).toBeLessThan(40);
  });

  test("BROKEN header has lighter red in expanded", async ({ dw }) => {
    await dw.goto();
    await dw.expand();
    const [r] = await dw.getColor(dw.header("broken", true), "color");
    expect(r).toBeGreaterThan(200);
  });

  test("Escape closes the dialog", async ({ dw }) => {
    await dw.goto();
    await dw.expand();
    await dw.collapse();
  });
});

test.describe("DualWrite - Responsive layout", () => {
  test.describe("mobile (375x812)", () => {
    test.use({ viewport: VIEWPORTS.mobile });

    test("panels are stacked vertically", async ({ dw }) => {
      await dw.goto();
      const broken = await dw.panel("broken").boundingBox();
      const fixed = await dw.panel("fixed").boundingBox();
      expect(broken).toBeTruthy();
      expect(fixed).toBeTruthy();
      expect(fixed!.y).toBeGreaterThan(broken!.y + broken!.height / 2);
    });
  });
});

test.describe("DualWrite - Accessibility", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("figure has correct aria-label", async ({ dw }) => {
    await dw.goto();
    await expect(dw.figure).toHaveAttribute(
      "aria-label",
      /Dual Write vs ACID.*102,568.*84,965.*85,033.*zero divergence/i,
    );
  });

  test("panels have data-side attributes", async ({ dw }) => {
    await dw.goto();
    await expect(dw.panel("broken")).toHaveAttribute("data-side", "broken");
    await expect(dw.panel("fixed")).toHaveAttribute("data-side", "fixed");
  });
});
