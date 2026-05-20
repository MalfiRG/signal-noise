import type { Page, Locator } from "@playwright/test";
import { DiagramBasePage, MIGRATION_BLOG_PATH, base, expect, VIEWPORTS } from "./diagram-base-page";

export class DualWritePage extends DiagramBasePage {
  constructor(page: Page) {
    super(page, "Dual Write vs ACID", "Dual Write vs ACID", MIGRATION_BLOG_PATH);
  }

  panel(side: "broken" | "fixed", expanded = false): Locator {
    return this.root(expanded).locator(`[data-side="${side}"]`);
  }

  panelStage(side: "broken" | "fixed", expanded = false): Locator {
    return this.panel(side, expanded);
  }

  header(side: "broken" | "fixed", expanded = false): Locator {
    const text = side === "broken" ? "BROKEN: Dual Write" : "FIXED: Single Transaction";
    return this.root(expanded).getByText(text);
  }

  stepBox(label: string, expanded = false): Locator {
    return this.root(expanded).getByText(label, { exact: true });
  }

  counterText(side: "broken" | "fixed", expanded = false): Locator {
    return this.panel(side, expanded).locator("div.font-mono.font-bold").first();
  }

  badge(text: "DIVERGED" | "ZERO DIVERGENCE", expanded = false): Locator {
    return this.root(expanded).getByText(text, { exact: true });
  }
}

type DWFixtures = { dw: DualWritePage };

const test = base.extend<DWFixtures>({
  dw: async ({ page }, use) => {
    await use(new DualWritePage(page));
  },
});

export { test, expect, VIEWPORTS };
