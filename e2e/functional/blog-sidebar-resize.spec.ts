import { test, expect, type Page } from "@playwright/test";

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 375, height: 812 };
const TABLET = { width: 767, height: 1024 };
const TOLERANCE = 10;
const DEFAULT_WIDTH = 280;

async function gotoBlog(page: Page) {
  await page.goto("/blog");
  await expect(page.locator('[data-testid="blog-post-tile"]').first()).toBeVisible();
}

async function getSidebarWidth(page: Page): Promise<number> {
  const sidebar = page.locator('[data-testid="blog-sidebar"]').first();
  const box = await sidebar.boundingBox();
  if (!box) throw new Error(`Sidebar not found at ${page.url()} viewport=${JSON.stringify(page.viewportSize())}`);
  return box.width;
}

async function dragHandle(page: Page, deltaX: number) {
  const handle = page.locator('[data-testid="sidebar-resize-handle"]').first();
  const box = await handle.boundingBox();
  if (!box) throw new Error(`Resize handle not found at ${page.url()} viewport=${JSON.stringify(page.viewportSize())}`);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY, { steps: 20 });
  await page.mouse.up();
  await page.waitForFunction(() => !document.body.classList.contains("select-none"), null, { timeout: 2000 }).catch(() => {});
}

test.describe("Blog sidebar resize - desktop", () => {
  test.use({ reducedMotion: "reduce" });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/blog");
    await page.evaluate(() => localStorage.removeItem("blog-sidebar-width"));
    await page.reload();
    await expect(page.locator('[data-testid="blog-post-tile"]').first()).toBeVisible();
  });

  test("renders at default 280px when no stored value exists", async ({ page }) => {
    await gotoBlog(page);
    const width = await getSidebarWidth(page);
    expect(width).toBeGreaterThan(DEFAULT_WIDTH - TOLERANCE);
    expect(width).toBeLessThan(DEFAULT_WIDTH + TOLERANCE);
  });

  test("drag to expand +100px from initial width", async ({ page }) => {
    await gotoBlog(page);
    const widthBefore = await getSidebarWidth(page);
    await dragHandle(page, 100);
    const widthAfter = await getSidebarWidth(page);
    const delta = widthAfter - widthBefore;
    expect(delta).toBeGreaterThan(100 - TOLERANCE);
    expect(delta).toBeLessThan(100 + TOLERANCE);
  });

  test("drag to shrink -50px stays above min width", async ({ page }) => {
    await gotoBlog(page);
    const widthBefore = await getSidebarWidth(page);
    await dragHandle(page, -50);
    const widthAfter = await getSidebarWidth(page);
    const delta = widthBefore - widthAfter;
    expect(delta).toBeGreaterThan(50 - TOLERANCE);
    expect(delta).toBeLessThan(50 + TOLERANCE);
  });

  test("clamp at min 200px", async ({ page }) => {
    await gotoBlog(page);
    await dragHandle(page, -200);
    const width = await getSidebarWidth(page);
    expect(width).toBeGreaterThanOrEqual(200 - TOLERANCE);
  });

  test("clamp at max (480px or 50% of parent)", async ({ page }) => {
    await gotoBlog(page);
    await dragHandle(page, 500);
    const width = await getSidebarWidth(page);
    expect(width).toBeLessThanOrEqual(480 + TOLERANCE);
  });

  test("persists width across reload", async ({ page }) => {
    await gotoBlog(page);
    await dragHandle(page, 80);
    const widthBefore = await getSidebarWidth(page);
    await page.reload();
    await gotoBlog(page);
    const widthAfter = await getSidebarWidth(page);
    expect(Math.abs(widthAfter - widthBefore)).toBeLessThan(TOLERANCE);
  });

  test("double-click resets to default", async ({ page }) => {
    await gotoBlog(page);
    await dragHandle(page, 100);
    const handle = page.locator('[data-testid="sidebar-resize-handle"]').first();
    await handle.dblclick();
    const width = await getSidebarWidth(page);
    expect(width).toBeGreaterThan(DEFAULT_WIDTH - TOLERANCE);
    expect(width).toBeLessThan(DEFAULT_WIDTH + TOLERANCE);
  });

  test("keyboard ArrowRight expands by ~50px (5 presses)", async ({ page }) => {
    await gotoBlog(page);
    const handle = page.locator('[data-testid="sidebar-resize-handle"]').first();
    await handle.focus();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowRight");
    }
    const width = await getSidebarWidth(page);
    expect(width).toBeGreaterThan(DEFAULT_WIDTH + 40);
    expect(width).toBeLessThan(DEFAULT_WIDTH + 60);
  });

  test("sidebar text is text-base (16px)", async ({ page }) => {
    const categoryBtn = page.locator('[data-testid="blog-sidebar"]').first().locator('[role="treeitem"] button').first();
    const fontSize = await categoryBtn.evaluate((el) => getComputedStyle(el).fontSize);
    expect(fontSize).toBe("16px");
  });

  test("post tiles stay contained after sidebar expand", async ({ page }) => {
    await gotoBlog(page);
    await dragHandle(page, 150);
    const sidebarWidth = await getSidebarWidth(page);
    const tile = page.locator('[data-testid="blog-post-tile"]').first();
    const tileBox = await tile.boundingBox();
    expect(tileBox).not.toBeNull();
    expect(tileBox!.x).toBeGreaterThanOrEqual(sidebarWidth - TOLERANCE);
    expect(tileBox!.width).toBeGreaterThan(200);
    const viewport = page.viewportSize()!;
    expect(tileBox!.x + tileBox!.width).toBeLessThanOrEqual(viewport.width + TOLERANCE);
  });
});

test.describe("Blog sidebar - mobile/tablet regression", () => {
  test.use({ reducedMotion: "reduce" });

  test("mobile 375px - no visible aside, Sheet opens with tree", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/blog");
    await expect(page.locator('[data-testid="blog-sidebar"]').first()).not.toBeVisible();
    await expect(page.locator('[data-testid="sidebar-resize-handle"]').first()).not.toBeVisible();
    const explorerBtn = page.locator('button[aria-label="Open blog file explorer"]:visible');
    await expect(explorerBtn).toBeVisible();
    await explorerBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[role="tree"]')).toBeVisible();
  });

  test("tablet 767px - no visible aside or resize handle", async ({ page }) => {
    await page.setViewportSize(TABLET);
    await page.goto("/blog");
    await expect(page.locator('[data-testid="blog-sidebar"]').first()).not.toBeVisible();
    await expect(page.locator('[data-testid="sidebar-resize-handle"]').first()).not.toBeVisible();
  });

  test("mobile Sheet content has text-base font", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/blog");
    const explorerBtn = page.locator('button[aria-label="Open blog file explorer"]:visible');
    await explorerBtn.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    const categoryBtn = page.locator('[role="dialog"] [role="treeitem"] button').first();
    await expect(categoryBtn).toBeVisible();
    const fontSize = await categoryBtn.evaluate((el) => getComputedStyle(el).fontSize);
    expect(fontSize).toBe("16px");
  });
});
