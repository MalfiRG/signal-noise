import { test, expect, VIEWPORTS, ENTITY_NAMES } from "../fixtures/kg-tunnel-page";

test.describe("KGTunnel - Minimized mode", () => {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vpName} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: vp });

      test("all 6 entity labels are visible", async ({ kg }) => {
        await kg.goto();
        for (const name of ENTITY_NAMES) {
          await expect(kg.entityLabel(name)).toBeVisible();
        }
      });

      test("both wing boxes are visible", async ({ kg }) => {
        await kg.goto();
        await expect(kg.wingBox("convos_metaorchestrator")).toBeVisible();
        await expect(kg.wingBox("metaorchestrator")).toBeVisible();
      });

      test("stats badge is visible", async ({ kg }) => {
        await kg.goto();
        await expect(kg.statsBadge()).toBeVisible();
      });

      test("tunnel labels are visible", async ({ kg }) => {
        await kg.goto();
        await expect(kg.tunnelLabel("auth patterns")).toBeVisible();
        await expect(kg.tunnelLabel("memory architecture")).toBeVisible();
        await expect(kg.tunnelLabel("mining scripts")).toBeVisible();
      });
    });
  }
});

test.describe("KGTunnel - Colors (reading mode)", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("entity abbreviation text has dark color", async ({ kg }) => {
    await kg.goto();
    const circle = kg.entityCircle("ScoutQL");
    const abbr = circle.locator("span");
    const [r, g, b] = await kg.getColor(abbr, "color");
    expect(r).toBeLessThan(60);
    expect(g).toBeLessThan(50);
  });

  test("entity label text has dark color", async ({ kg }) => {
    await kg.goto();
    const label = kg.entityLabel("FastAPI");
    const [r, g, b] = await kg.getColor(label, "color");
    expect(r).toBeLessThan(60);
    expect(g).toBeLessThan(50);
  });

  test("wing box has dark label text", async ({ kg }) => {
    await kg.goto();
    const label = kg.wingBox("convos_metaorchestrator").locator("span.font-mono.font-medium");
    const [r, g, b] = await kg.getColor(label, "color");
    expect(r).toBeLessThan(60);
    expect(g).toBeLessThan(50);
  });
});

test.describe("KGTunnel - Maximized mode", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("expand opens fullscreen dialog", async ({ kg }) => {
    await kg.goto();
    await kg.expand();
    await expect(kg.dialog).toHaveAttribute("aria-modal", "true");
  });

  test("dialog background is dark", async ({ kg }) => {
    await kg.goto();
    await kg.expand();
    const [r, g, b] = await kg.getColor(kg.dialog, "backgroundColor");
    expect(r).toBeLessThan(30);
    expect(g).toBeLessThan(30);
    expect(b).toBeLessThan(40);
  });

  test("Escape closes the dialog", async ({ kg }) => {
    await kg.goto();
    await kg.expand();
    await kg.collapse();
  });
});

test.describe("KGTunnel - Accessibility", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("figure has correct aria-label", async ({ kg }) => {
    await kg.goto();
    await expect(kg.figure).toHaveAttribute(
      "aria-label",
      /Knowledge Graph.*534 entities.*5,176 triples.*13 tunnels/,
    );
  });
});
