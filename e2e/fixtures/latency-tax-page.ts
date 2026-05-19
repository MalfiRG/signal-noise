import type { Page, Locator } from "@playwright/test";
import { DiagramBasePage, base, expect, VIEWPORTS } from "./diagram-base-page";

export class LatencyTaxPage extends DiagramBasePage {
  readonly hnswMeter: Locator;
  readonly sqliteMeter: Locator;
  readonly verdictLine: Locator;

  constructor(page: Page) {
    super(page, "Latency Tax", "The Latency Tax");
    this.hnswMeter = page.locator('[aria-label="HNSW query latency: 80ms"]');
    this.sqliteMeter = page.locator('[aria-label="sqlite-vec query latency: 119ms"]');
    this.verdictLine = page.getByText("+39ms per query buys 100% correctness");
  }

  hnswLabel(expanded = false): Locator {
    return this.root(expanded).locator("span.font-mono.font-medium").filter({ hasText: "HNSW" });
  }

  sqliteLabel(expanded = false): Locator {
    return this.root(expanded).locator("span.font-mono.font-medium").filter({ hasText: "sqlite-vec" });
  }

  badge(type: "faster" | "slower", expanded = false): Locator {
    return this.root(expanded).getByText(type, { exact: true });
  }

  hitRateValue(value: string, expanded = false): Locator {
    return this.root(expanded).locator("div.font-bold.tabular-nums").filter({ hasText: value });
  }

  sectionHeader(text: string, expanded = false): Locator {
    return this.root(expanded).locator("span.tracking-widest.uppercase").filter({ hasText: text });
  }
}

type LTFixtures = { lt: LatencyTaxPage };

const test = base.extend<LTFixtures>({
  lt: async ({ page }, use) => {
    await use(new LatencyTaxPage(page));
  },
});

export { test, expect, VIEWPORTS };
