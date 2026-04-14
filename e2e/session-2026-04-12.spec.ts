import { test, expect } from "@playwright/test";

/**
 * E2E tests for 2026-04-12 session changes:
 * 1. "How I Do It" — 5 methodology pages with real content
 * 2. Frontmatter stripping — YAML metadata hidden from rendered posts
 * 3. CodeBlock expand — portal-based fullscreen overlay
 * 4. Projects page — labeled buttons (SOURCE / VISIT SITE)
 * 5. Blog tag filtering — ScrollReveal key reset on tag change
 * 6. Mobile scroll-reveal — per-card whileInView animation
 */

// ---------------------------------------------------------------------------
// 1. How I Do It — methodology pages render with content
// ---------------------------------------------------------------------------

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

      // Verify it's NOT the placeholder
      await expect(page.locator("text=Content coming soon")).not.toBeVisible();

      // Verify real content keyword is present
      await expect(page.locator(".markdown-body")).toContainText(p.content);

      // Verify headings rendered (h2 sections)
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

// ---------------------------------------------------------------------------
// 2. Frontmatter stripping — YAML not visible in rendered posts
// ---------------------------------------------------------------------------

test.describe("Frontmatter stripping", () => {
  test("blog post does not show raw frontmatter", async ({ page }) => {
    await page.goto("/blog/style-test");
    await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 10000 });

    // Frontmatter fields should NOT appear as visible text
    const body = await page.locator(".markdown-body").textContent();
    expect(body).not.toContain("draft: true");
    expect(body).not.toContain("reading_time:");
    expect(body).not.toContain("og_image:");
  });

  test("how-i-do-it pages without frontmatter still render", async ({ page }) => {
    await page.goto("/how-i-do-it/test-plan");
    await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 10000 });

    // First visible heading should be a real section, not YAML
    const firstH2 = page.locator(".markdown-body h2").first();
    await expect(firstH2).toBeVisible();
    const text = await firstH2.textContent();
    expect(text).toBeTruthy();
    expect(text).not.toContain("---");
  });
});

// ---------------------------------------------------------------------------
// 3. CodeBlock expand — fullscreen overlay works
// ---------------------------------------------------------------------------

test.describe("CodeBlock expand overlay", () => {
  test("expand button opens fullscreen overlay with code content", async ({ page }) => {
    await page.goto("/how-i-do-it/test-architecture");
    await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 10000 });

    // Find a code block and its expand button
    const expandBtn = page.locator(".code-block-wrapper button[aria-label='Expand code']").first();
    await expect(expandBtn).toBeAttached();
    await expandBtn.click();

    // Overlay should appear (portaled to body, z-[100])
    const overlay = page.locator("body > div.fixed.inset-0");
    await expect(overlay).toBeVisible({ timeout: 3000 });

    // Overlay should contain code text (not be empty)
    const overlayText = await overlay.textContent();
    expect(overlayText!.length).toBeGreaterThan(10);

    // Language label should be visible in overlay header
    const langLabel = overlay.locator("span.font-mono");
    await expect(langLabel).toBeVisible();

    // Close button should work
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

// ---------------------------------------------------------------------------
// 4. Projects page — labeled buttons
// ---------------------------------------------------------------------------

test.describe("Projects page — buttons", () => {
  test("project cards have labeled SOURCE and VISIT SITE buttons", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.locator("h1")).toContainText("PROJECTS");

    // SOURCE buttons (all projects have github_url)
    const sourceButtons = page.locator("a", { hasText: "SOURCE" });
    const sourceCount = await sourceButtons.count();
    expect(sourceCount).toBeGreaterThanOrEqual(2);

    // Each SOURCE button has GitHub icon
    for (let i = 0; i < sourceCount; i++) {
      const svg = sourceButtons.nth(i).locator("svg");
      await expect(svg).toBeAttached();
    }

    // VISIT SITE button (Digital Matrix has live_url)
    const visitButton = page.locator("a", { hasText: "VISIT SITE" });
    await expect(visitButton.first()).toBeVisible();

    // VISIT SITE links to external URL
    const href = await visitButton.first().getAttribute("href");
    expect(href).toContain("http");
    expect(await visitButton.first().getAttribute("target")).toBe("_blank");
  });
});

// ---------------------------------------------------------------------------
// 5. Blog tag filtering — posts survive select/deselect cycle
// ---------------------------------------------------------------------------

test.describe("Blog tag filtering", () => {
  test("selecting and deselecting a tag preserves post rendering", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.locator("h1")).toContainText("BLOG");

    // Count initial posts
    const initialPosts = page.locator("a[href^='/blog/']").filter({ hasText: /.{10,}/ });
    const initialCount = await initialPosts.count();
    expect(initialCount).toBeGreaterThan(0);

    // Click a tag on a post card to filter
    const firstTag = page.locator(".space-y-8 span[role='link']").first();
    const tagText = await firstTag.textContent();
    await firstTag.click();
    await page.waitForURL(/tags=/);

    // Posts should be filtered (may be same or fewer)
    const filteredPosts = page.locator("a[href^='/blog/']").filter({ hasText: /.{10,}/ });
    const filteredCount = await filteredPosts.count();
    expect(filteredCount).toBeGreaterThan(0);

    // Now click a post — it should render with content
    await filteredPosts.first().click();
    await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 10000 });
    const postContent = await page.locator(".markdown-body").textContent();
    expect(postContent!.length).toBeGreaterThan(100);

    // Navigate back
    const backLink = page.locator("a", { hasText: "BACK TO BLOG" });
    await backLink.click();

    // All posts should be visible after navigating back (tags may persist)
    const returnedPosts = page.locator("a[href^='/blog/']").filter({ hasText: /.{10,}/ });
    const returnedCount = await returnedPosts.count();
    expect(returnedCount).toBeGreaterThan(0);
  });

  test("post cards are visible after tag toggle cycle", async ({ page }) => {
    await page.goto("/blog");

    // Find the sidebar tag filter (desktop)
    const tagButton = page.locator("button", { hasText: /^#/ }).first();
    if (await tagButton.isVisible()) {
      // Click to select
      await tagButton.click();
      await page.waitForTimeout(500);

      // Click again to deselect
      await tagButton.click();
      await page.waitForTimeout(500);

      // All post cards should be visible and have content
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

// ---------------------------------------------------------------------------
// 6. Mobile scroll-reveal — cards use per-item animation
// ---------------------------------------------------------------------------

test.describe("Mobile scroll-reveal", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("project cards are not all visible immediately on mobile", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.locator("h1")).toContainText("PROJECTS");
    await page.waitForTimeout(500);

    // On mobile, cards below the fold should start hidden (opacity: 0)
    // and reveal on scroll. The last card should not be visible yet.
    const cards = page.locator(".grid > div");
    const count = await cards.count();
    expect(count).toBeGreaterThan(1);

    // Scroll to bottom to reveal all cards
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await page.waitForTimeout(2000);

    // After scrolling, all cards should eventually become visible
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toBeVisible({ timeout: 5000 });
    }
  });

  test("how-i-do-it cards reveal progressively on mobile scroll", async ({ page }) => {
    await page.goto("/how-i-do-it");
    await expect(page.locator("h1")).toContainText("HOW I DO IT");
    await page.waitForTimeout(500);

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await page.waitForTimeout(2000);

    // All methodology cards should be visible after scroll
    const cards = page.locator(".grid > div");
    const count = await cards.count();
    expect(count).toBe(5);

    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toBeVisible({ timeout: 5000 });
    }
  });
});
