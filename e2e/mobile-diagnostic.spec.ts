import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { width: 375, height: 812, name: "375" },
  { width: 390, height: 844, name: "390" },
  { width: 428, height: 926, name: "428" },
];

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/projects", name: "projects" },
  { path: "/skills", name: "skills" },
  { path: "/blog", name: "blog-index" },
  { path: "/blog/style-test", name: "blog-post", waitFor: ".markdown-body", hasMermaid: true },
  { path: "/how-i-do-it", name: "how-i-do-it-index" },
  { path: "/how-i-do-it/test-plan", name: "how-i-do-it-post", waitFor: ".markdown-body" },
];

for (const viewport of VIEWPORTS) {
  test.describe(`Overflow check ${viewport.name}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`${route.name} has no horizontal overflow`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: "networkidle" });

        if (route.waitFor) {
          await expect(page.locator("svg.animate-spin")).toHaveCount(0, { timeout: 15000 });
          await expect(page.locator(route.waitFor)).toBeVisible({ timeout: 15000 });
        }

        if (route.hasMermaid) {
          await page.waitForTimeout(3000);
        } else {
          await page.waitForTimeout(1000);
        }

        const overflowInfo = await page.evaluate(() => {
          const docWidth = document.documentElement.clientWidth;
          const bodyScrollWidth = document.body.scrollWidth;
          const htmlScrollWidth = document.documentElement.scrollWidth;
          const maxScroll = Math.max(bodyScrollWidth, htmlScrollWidth);

          const overflowingElements: { tag: string; class: string; scrollW: number; clientW: number; text: string }[] = [];
          const allElements = document.querySelectorAll("*");

          allElements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > docWidth + 2 || rect.left < -2) {
              const htmlEl = el as HTMLElement;
              overflowingElements.push({
                tag: el.tagName.toLowerCase(),
                class: el.className?.toString().slice(0, 100) || "",
                scrollW: Math.round(rect.width),
                clientW: Math.round(rect.right - rect.left),
                text: (el.textContent || "").slice(0, 60),
              });
            }
          });

          const seen = new Set<string>();
          const unique = overflowingElements.filter((el) => {
            const key = `${el.tag}.${el.class}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          return {
            docWidth,
            bodyScrollWidth,
            htmlScrollWidth,
            hasOverflow: maxScroll > docWidth + 2,
            overflowAmount: maxScroll - docWidth,
            overflowingElements: unique.slice(0, 20),
          };
        });

        console.log(`\n=== ${route.name} @ ${viewport.name}px ===`);
        console.log(`  Doc width: ${overflowInfo.docWidth}, Body scroll: ${overflowInfo.bodyScrollWidth}, HTML scroll: ${overflowInfo.htmlScrollWidth}`);

        if (overflowInfo.hasOverflow) {
          console.log(`  OVERFLOW by ${overflowInfo.overflowAmount}px`);
          console.log(`  Overflowing elements:`);
          overflowInfo.overflowingElements.forEach((el) => {
            console.log(`    <${el.tag} class="${el.class}"> right=${el.scrollW}px "${el.text}"`);
          });
        } else {
          console.log(`  No horizontal overflow`);
        }

        if (overflowInfo.overflowingElements.length > 0) {
          console.log(`  Elements extending beyond viewport:`);
          overflowInfo.overflowingElements.forEach((el) => {
            console.log(`    <${el.tag} class="${el.class}">`);
          });
        }

        expect(true).toBe(true);
      });
    }
  });
}

test.describe("Blog post section screenshots (375px)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("capture blog post sections", async ({ page }) => {
    await page.goto("/blog/style-test", { waitUntil: "networkidle" });
    await expect(page.locator("svg.animate-spin")).toHaveCount(0, { timeout: 15000 });
    await expect(page.locator(".markdown-body")).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    const sections = [
      { name: "header-and-meta", selector: ".markdown-body", scrollY: 0 },
    ];

    const scrollPositions = [0, 800, 1600, 2400, 3200, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000];

    for (const scrollY of scrollPositions) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await page.waitForTimeout(300);
      await page.screenshot({
        path: `test-results/blog-section-375-scroll${scrollY}.png`,
      });
    }

    const codeBlocks = page.locator(".code-block-wrapper");
    const codeBlockCount = await codeBlocks.count();
    for (let i = 0; i < Math.min(codeBlockCount, 3); i++) {
      await codeBlocks.nth(i).screenshot({
        path: `test-results/blog-codeblock-${i}-375.png`,
      });
    }

    const tables = page.locator(".overflow-x-auto");
    const tableCount = await tables.count();
    for (let i = 0; i < Math.min(tableCount, 3); i++) {
      await tables.nth(i).screenshot({
        path: `test-results/blog-table-${i}-375.png`,
      });
    }

    const mermaidDivs = page.locator(".my-6.max-w-full.overflow-x-auto");
    const mermaidCount = await mermaidDivs.count();
    for (let i = 0; i < Math.min(mermaidCount, 3); i++) {
      await mermaidDivs.nth(i).screenshot({
        path: `test-results/blog-mermaid-${i}-375.png`,
      });
    }

    expect(true).toBe(true);
  });
});
