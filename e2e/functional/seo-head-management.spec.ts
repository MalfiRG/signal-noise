import { test, expect } from "@playwright/test";
import { prepareContext } from "../fixtures/visual-determinism";

test.describe("SEO head management", () => {
  const routes = [
    {
      path: "/",
      titleContains: "PIOTR_TARACH | SIGNAL_NOISE",
      titleExact: true,
    },
    {
      path: "/projects",
      titleContains: "Projects",
    },
    {
      path: "/skills",
      titleContains: "Skills",
    },
    {
      path: "/blog",
      titleContains: "Blog",
    },
    {
      path: "/how-i-do-it",
      titleContains: "How I Do It",
    },
  ];

  for (const route of routes) {
    test(`${route.path} has correct title`, async ({ page }) => {
      await prepareContext(page);
      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");

      if (route.titleExact) {
        await expect(page).toHaveTitle(route.titleContains);
      } else {
        await expect(page).toHaveTitle(new RegExp(route.titleContains));
      }
    });
  }

  test("/blog slug page has post title in document title", async ({ page }) => {
    await prepareContext(page);
    await page.goto("/blog/style-test");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveTitle(/Style Test/);
  });

  test("/how-i-do-it slug page has page title", async ({ page }) => {
    await prepareContext(page);
    await page.goto("/how-i-do-it/test-plan");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveTitle(/Test Plan/);
  });

  test("canonical URL updates per route", async ({ page }) => {
    await prepareContext(page);
    await page.goto("/projects");
    await page.waitForLoadState("domcontentloaded");

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute(
      "href",
      "https://piotrtarach.dev/projects"
    );
  });

  test("JSON-LD WebSite + Person schema present on homepage", async ({ page }) => {
    await prepareContext(page);
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const jsonLd = await page.evaluate(() => {
      const script = document.querySelector(
        'script[type="application/ld+json"]'
      );
      return script ? JSON.parse(script.textContent!) : null;
    });

    expect(jsonLd).not.toBeNull();
    expect(jsonLd["@graph"]).toBeDefined();
    const types = jsonLd["@graph"].map((item: { "@type": string }) => item["@type"]);
    expect(types).toContain("WebSite");
    expect(types).toContain("Person");
  });
});
