import type { Page, Locator } from "@playwright/test";
import { DiagramBasePage, MIGRATION_BLOG_PATH, base, expect, VIEWPORTS } from "./diagram-base-page";

export class PalaceStructurePage extends DiagramBasePage {
  constructor(page: Page) {
    super(page, "Palace Structure", "Palace Structure", MIGRATION_BLOG_PATH);
  }

  palaceNode(expanded = false): Locator {
    return this.root(expanded).locator("text=MemPalace").first();
  }

  wingNode(label: string, expanded = false): Locator {
    return this.root(expanded).getByText(label, { exact: true });
  }

  tierLabel(tier: string, expanded = false): Locator {
    return this.root(expanded).locator("span.tracking-widest.uppercase").filter({ hasText: tier });
  }

  allNodeBoxes(expanded = false): Locator {
    return this.root(expanded).locator("div.rounded-lg.border");
  }

  connectorLines(expanded = false): Locator {
    return this.root(expanded).locator("div.w-0\\.5, div.h-0\\.5");
  }
}

type PSFixtures = { ps: PalaceStructurePage };

const test = base.extend<PSFixtures>({
  ps: async ({ page }, use) => {
    await use(new PalaceStructurePage(page));
  },
});

export { test, expect, VIEWPORTS };
