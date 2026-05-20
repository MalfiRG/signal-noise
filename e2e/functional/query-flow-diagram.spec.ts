import { test, expect, VIEWPORTS } from "../fixtures/query-flow-page";

const STAGES = ["Query", "KG Lookup", "Closet Scan", "Vector KNN", "Rank Fusion", "Results"];

test.describe("QueryFlow - Minimized mode", () => {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vpName} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: vp });

      test("all 6 stage nodes are visible", async ({ qf }) => {
        await qf.goto();
        for (const stage of STAGES) {
          await expect(qf.stageNode(stage)).toBeVisible();
        }
      });

      test("latency badges are visible", async ({ qf }) => {
        await qf.goto();
        await expect(qf.latencyBadge("3ms")).toBeVisible();
        await expect(qf.latencyBadge("5ms")).toBeVisible();
        await expect(qf.latencyBadge("119ms")).toBeVisible();
      });
    });
  }
});

test.describe("QueryFlow - Colors (reading mode)", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("stage node has dark label text", async ({ qf }) => {
    await qf.goto();
    const label = qf.stageNode("Query").locator("span.tracking-widest").first();
    const [r, g, b] = await qf.getColor(label, "color");
    expect(r).toBeLessThan(120);
    expect(g).toBeLessThan(110);
  });

  test("stage node has light background", async ({ qf }) => {
    await qf.goto();
    const node = qf.stageNode("Query");
    const [r, g, b] = await qf.getColor(node, "backgroundColor");
    expect(r).toBeGreaterThan(230);
    expect(g).toBeGreaterThan(230);
    expect(b).toBeGreaterThan(230);
  });
});

test.describe("QueryFlow - Maximized mode", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("expand opens fullscreen dialog", async ({ qf }) => {
    await qf.goto();
    await qf.expand();
    await expect(qf.dialog).toHaveAttribute("aria-modal", "true");
  });

  test("dialog background is dark", async ({ qf }) => {
    await qf.goto();
    await qf.expand();
    const [r, g, b] = await qf.getColor(qf.dialog, "backgroundColor");
    expect(r).toBeLessThan(30);
    expect(g).toBeLessThan(30);
    expect(b).toBeLessThan(40);
  });

  test("Escape closes the dialog", async ({ qf }) => {
    await qf.goto();
    await qf.expand();
    await qf.collapse();
  });
});

test.describe("QueryFlow - Accessibility", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("figure has correct aria-label", async ({ qf }) => {
    await qf.goto();
    await expect(qf.figure).toHaveAttribute(
      "aria-label",
      /Query Flow.*6-stage.*KG Lookup.*3ms.*Vector KNN.*119ms/,
    );
  });
});
