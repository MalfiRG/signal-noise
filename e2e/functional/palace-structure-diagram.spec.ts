import { test, expect, VIEWPORTS } from "../fixtures/palace-structure-page";

test.describe("PalaceStructure - Minimized mode", () => {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`${vpName} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: vp });

      test("Palace node is visible", async ({ ps }) => {
        await ps.goto();
        await expect(ps.palaceNode()).toBeVisible();
      });

      test("both wing nodes are visible", async ({ ps }) => {
        await ps.goto();
        await expect(ps.wingNode("convos_metaorchestrator")).toBeVisible();
        await expect(ps.wingNode("metaorchestrator")).toBeVisible();
      });

      test("tier labels are visible", async ({ ps }) => {
        await ps.goto();
        await expect(ps.tierLabel("PALACE")).toBeVisible();
        await expect(ps.tierLabel("WING").first()).toBeVisible();
      });
    });
  }
});

test.describe("PalaceStructure - Responsive layout", () => {
  test.describe("mobile (375x812)", () => {
    test.use({ viewport: VIEWPORTS.mobile });

    test("wings stack vertically on mobile", async ({ ps }) => {
      await ps.goto();
      const wing1 = ps.wingNode("convos_metaorchestrator");
      const wing2 = ps.wingNode("metaorchestrator");
      const box1 = await wing1.boundingBox();
      const box2 = await wing2.boundingBox();
      expect(box1).toBeTruthy();
      expect(box2).toBeTruthy();
      expect(box2!.y).toBeGreaterThan(box1!.y + box1!.height);
    });
  });

  test.describe("desktop (1440x900)", () => {
    test.use({ viewport: VIEWPORTS.desktop });

    test("wings are side by side on desktop", async ({ ps }) => {
      await ps.goto();
      const wing1 = ps.wingNode("convos_metaorchestrator");
      const wing2 = ps.wingNode("metaorchestrator");
      const box1 = await wing1.boundingBox();
      const box2 = await wing2.boundingBox();
      expect(box1).toBeTruthy();
      expect(box2).toBeTruthy();
      expect(Math.abs(box1!.y - box2!.y)).toBeLessThan(20);
      expect(box2!.x).toBeGreaterThan(box1!.x + box1!.width);
    });
  });
});

test.describe("PalaceStructure - Colors (reading mode)", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("Palace node has dark label text", async ({ ps }) => {
    await ps.goto();
    const [r, g, b] = await ps.getColor(ps.palaceNode(), "color");
    expect(r).toBeLessThan(60);
    expect(g).toBeLessThan(50);
  });

  test("wing node has dark label text", async ({ ps }) => {
    await ps.goto();
    const [r, g, b] = await ps.getColor(ps.wingNode("convos_metaorchestrator"), "color");
    expect(r).toBeLessThan(60);
    expect(g).toBeLessThan(50);
  });
});

test.describe("PalaceStructure - Maximized mode", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("expand opens fullscreen dialog", async ({ ps }) => {
    await ps.goto();
    await ps.expand();
    await expect(ps.dialog).toHaveAttribute("aria-modal", "true");
  });

  test("full tree shows rooms and closets in expanded", async ({ ps }) => {
    await ps.goto();
    await ps.expand();
    await expect(ps.tierLabel("ROOM", true).first()).toBeVisible();
    await expect(ps.tierLabel("CLOSET", true).first()).toBeVisible();
  });

  test("Escape closes the dialog", async ({ ps }) => {
    await ps.goto();
    await ps.expand();
    await ps.collapse();
  });
});

test.describe("PalaceStructure - Accessibility", () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test("figure has correct aria-label", async ({ ps }) => {
    await ps.goto();
    await expect(ps.figure).toHaveAttribute(
      "aria-label",
      "Palace Structure: MemPalace with 2 wings - convos_metaorchestrator (60,935 drawers) and metaorchestrator (3,576 drawers)",
    );
  });
});
