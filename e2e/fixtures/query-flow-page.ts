import type { Page, Locator } from "@playwright/test";
import { DiagramBasePage, MIGRATION_BLOG_PATH, base, expect, VIEWPORTS } from "./diagram-base-page";

export class QueryFlowPage extends DiagramBasePage {
  constructor(page: Page) {
    super(page, "Query Flow", "Query Flow", MIGRATION_BLOG_PATH);
  }

  stageNode(label: string, expanded = false): Locator {
    return this.root(expanded).locator("div.rounded-lg").filter({ hasText: label });
  }

  latencyBadge(value: string, expanded = false): Locator {
    return this.root(expanded).getByText(value, { exact: true });
  }

  allStageNodes(expanded = false): Locator {
    return this.root(expanded).locator("div.rounded-lg.border");
  }
}

type QFFixtures = { qf: QueryFlowPage };

const test = base.extend<QFFixtures>({
  qf: async ({ page }, use) => {
    await use(new QueryFlowPage(page));
  },
});

export { test, expect, VIEWPORTS };
