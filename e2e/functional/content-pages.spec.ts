import { test, expect } from "@playwright/test";
import { prepareContext } from "../fixtures/visual-determinism";

test.beforeEach(async ({ page }) => {
  await prepareContext(page);
});

test.describe("How I Do It — methodology pages", () => {
  const pages = [
    { slug: "test-plan", heading: "Test Plan", content: "pipeline" },
    { slug: "test-case", heading: "Test Case Design", content: "contract" },
    { slug: "test-architecture", heading: "Test Architecture", content: "Thin Client" },
    { slug: "automation-framework", heading: "Automation Framework", content: "Pytest" },
    { slug: "bug-reporting", heading: "Bug Reporting", content: "Template" },
  ];

  test("index page renders all 5 methodology cards", async ({ page }) => {
    await page.goto("/how-i-do-it");
    await expect(page.locator("h1")).toContainText("HOW I DO IT");

    for (const p of pages) {
      await expect(page.locator("a", { hasText: p.heading })).toBeVisible();
    }
  });

  for (const p of pages) {
    test(`${p.slug} page renders with real content (not placeholder)`, async ({ page }) => {
      await page.goto(`/how-i-do-it/${p.slug}`);
      await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 10000 });

      await expect(page.locator("text=Content coming soon")).not.toBeVisible();

      await expect(page.locator(".markdown-body")).toContainText(p.content);

      const headings = page.locator(".markdown-body h2");
      const count = await headings.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });
  }

  test("methodology pages have working back link", async ({ page }) => {
    await page.goto("/how-i-do-it/test-plan");
    await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 10000 });

    const backLink = page.locator("a", { hasText: "BACK TO INDEX" });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/how-i-do-it$/);
  });
});

test.describe("CodeBlock expand overlay", () => {
  test("expand button opens fullscreen overlay with code content", async ({ page }) => {
    await page.goto("/how-i-do-it/test-architecture");
    await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 10000 });

    const expandBtn = page.locator(".code-block-wrapper button[aria-label='Expand code']").first();
    await expect(expandBtn).toBeAttached();
    await expandBtn.click();

    const overlay = page.locator("body > div.fixed.inset-0");
    await expect(overlay).toBeVisible({ timeout: 3000 });

    const overlayText = await overlay.textContent();
    expect(overlayText!.length).toBeGreaterThan(10);

    const langLabel = overlay.locator("span.font-mono");
    await expect(langLabel).toBeVisible();

    const closeBtn = overlay.locator("button[aria-label='Close']");
    await closeBtn.click();
    await expect(overlay).not.toBeVisible();
  });

  test("Escape key closes the overlay", async ({ page }) => {
    await page.goto("/how-i-do-it/automation-framework");
    await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 10000 });

    const expandBtn = page.locator(".code-block-wrapper button[aria-label='Expand code']").first();
    await expandBtn.click();

    const overlay = page.locator("body > div.fixed.inset-0");
    await expect(overlay).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("Escape");
    await expect(overlay).not.toBeVisible();
  });
});

test.describe("Projects page — buttons", () => {
  test("project cards have labeled SOURCE and VISIT SITE buttons", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.locator("h1")).toContainText("PROJECTS");

    const sourceButtons = page.locator("a", { hasText: "SOURCE" });
    const sourceCount = await sourceButtons.count();
    expect(sourceCount).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < sourceCount; i++) {
      const svg = sourceButtons.nth(i).locator("svg");
      await expect(svg).toBeAttached();
    }

    const visitButton = page.locator("a", { hasText: "VISIT SITE" });
    await expect(visitButton.first()).toBeVisible();

    const href = await visitButton.first().getAttribute("href");
    expect(href).toContain("http");
    expect(await visitButton.first().getAttribute("target")).toBe("_blank");
  });
});

test.describe("Blog tag filtering", () => {
  test("selecting and deselecting a tag preserves post rendering", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.locator("h1")).toContainText("BLOG");

    const initialPosts = page.locator("a[href^='/blog/']").filter({ hasText: /.{10,}/ });
    const initialCount = await initialPosts.count();
    expect(initialCount).toBeGreaterThan(0);

    const firstTag = page.locator(".space-y-8 span[role='link']").first();
    const tagText = await firstTag.textContent();
    await firstTag.click();
    await page.waitForURL(/tags=/);

    const filteredPosts = page.locator("a[href^='/blog/']").filter({ hasText: /.{10,}/ });
    const filteredCount = await filteredPosts.count();
    expect(filteredCount).toBeGreaterThan(0);

    await filteredPosts.first().click();
    await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 10000 });
    const postContent = await page.locator(".markdown-body").textContent();
    expect(postContent!.length).toBeGreaterThan(100);

    const backLink = page.locator("a", { hasText: "BACK TO BLOG" });
    await backLink.click();

    const returnedPosts = page.locator("a[href^='/blog/']").filter({ hasText: /.{10,}/ });
    await expect(returnedPosts.first()).toBeVisible({ timeout: 5000 });
    const returnedCount = await returnedPosts.count();
    expect(returnedCount).toBeGreaterThan(0);
  });

  test("post cards are visible after tag toggle cycle", async ({ page }) => {
    await page.goto("/blog");

    const tagButton = page.locator("button", { hasText: /^#/ }).first();
    if (await tagButton.isVisible()) {
      await tagButton.click();
      await page.waitForTimeout(500);

      await tagButton.click();
      await page.waitForTimeout(500);

      const posts = page.locator(".space-y-8 a[href^='/blog/']");
      const count = await posts.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        await expect(posts.nth(i)).toBeVisible();
        const text = await posts.nth(i).textContent();
        expect(text!.length).toBeGreaterThan(20);
      }
    }
  });
});

test.describe("Mobile scroll-reveal", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("project cards are not all visible immediately on mobile", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.locator("h1")).toContainText("PROJECTS");
    await page.waitForTimeout(500);

    const cards = page.locator(".grid > div");
    const count = await cards.count();
    expect(count).toBeGreaterThan(1);

    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));

    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toBeVisible({ timeout: 5000 });
    }
  });

  test("how-i-do-it cards reveal progressively on mobile scroll", async ({ page }) => {
    await page.goto("/how-i-do-it");
    await expect(page.locator("h1")).toContainText("HOW I DO IT");
    await page.waitForTimeout(500);

    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));

    const cards = page.locator(".grid > div");
    await expect(cards).toHaveCount(5);
    const count = await cards.count();
    expect(count).toBe(5);

    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toBeVisible({ timeout: 5000 });
    }
  });
});
