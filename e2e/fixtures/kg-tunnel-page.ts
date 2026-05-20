import type { Page, Locator } from "@playwright/test";
import { DiagramBasePage, MIGRATION_BLOG_PATH, base, expect, VIEWPORTS } from "./diagram-base-page";

const ENTITY_NAMES = ["ScoutQL", "FastAPI", "Playwright", "MemPalace", "ChromaDB", "sqlite-vec"] as const;

export class KGTunnelPage extends DiagramBasePage {
  constructor(page: Page) {
    super(page, "Knowledge Graph and Tunnels", "Knowledge Graph + Tunnels", MIGRATION_BLOG_PATH);
  }

  entityLabel(name: string, expanded = false): Locator {
    return this.root(expanded).locator("span.font-mono").filter({ hasText: new RegExp(`^${name}$`) });
  }

  entityCircle(name: string, expanded = false): Locator {
    return this.root(expanded).locator("div.rounded-full.border-2").filter({ hasText: name.slice(0, 2).toUpperCase() });
  }

  wingBox(label: string, expanded = false): Locator {
    return this.root(expanded).locator("div.rounded-lg.border-2").filter({
      has: this.page.locator("span.font-mono.font-medium", { hasText: new RegExp(`^${label}$`) }),
    });
  }

  tunnelLabel(text: string, expanded = false): Locator {
    return this.root(expanded).getByText(text);
  }

  statsBadge(expanded = false): Locator {
    return this.root(expanded).getByText("534 entities");
  }

  relationBadge(text: string, expanded = false): Locator {
    return this.root(expanded).locator("span.font-mono").filter({ hasText: text });
  }
}

type KGFixtures = { kg: KGTunnelPage };

const test = base.extend<KGFixtures>({
  kg: async ({ page }, use) => {
    await use(new KGTunnelPage(page));
  },
});

export { test, expect, VIEWPORTS, ENTITY_NAMES };
