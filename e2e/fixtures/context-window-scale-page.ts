import type { Page, Locator } from "@playwright/test";
import { DiagramBasePage, base, expect, VIEWPORTS } from "./diagram-base-page";

export class ContextWindowScalePage extends DiagramBasePage {
  readonly separator: Locator;

  constructor(page: Page) {
    super(page, "Context Window Scale", "Context Window Scale");
    this.separator = this.figure.locator("div.my-2.origin-left");
  }

  modelRow(name: string, expanded = false): Locator {
    return this.root(expanded).locator("div.flex.items-center.gap-2").filter({ hasText: name });
  }

  modelLabel(name: string, expanded = false): Locator {
    return this.modelRow(name, expanded).locator("span.text-xs.font-mono").first();
  }

  mempalaceRow(expanded = false): Locator {
    return this.root(expanded).locator("div.flex.items-center.gap-2").filter({ hasText: "MemPalace" });
  }

  mempalaceLabel(expanded = false): Locator {
    return this.mempalaceRow(expanded).locator("span.text-xs.font-mono").first();
  }

  subLabel(expanded = false): Locator {
    return this.root(expanded).getByText("constant regardless of model");
  }
}

type CWSFixtures = { cws: ContextWindowScalePage };

const test = base.extend<CWSFixtures>({
  cws: async ({ page }, use) => {
    await use(new ContextWindowScalePage(page));
  },
});

export { test, expect, VIEWPORTS };
