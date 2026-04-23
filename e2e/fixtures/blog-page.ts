import { test as base, expect } from "@playwright/test";
import { prepareContext, stabilizeForLayout } from "./visual-determinism";

type BlogPageFixtures = {
  blogPage: import("@playwright/test").Page;
};

export const test = base.extend<BlogPageFixtures>({
  blogPage: async ({ page }, use) => {
    await prepareContext(page);
    await page.goto("/blog/style-test");
    await stabilizeForLayout(page, {
      readyLocator: page.locator(".markdown-body"),
    });
    await use(page);
  },
});

export { expect };
