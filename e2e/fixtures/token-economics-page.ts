import { test as base, expect, type Page, type Locator } from "@playwright/test";
import { prepareContext, stabilizeForLayout } from "./visual-determinism";

const BLOG_PATH = "/blog/mempalace-retrieval-economics";

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

function rgb(s: string): [number, number, number] {
  const m = s.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!m) throw new Error(`Could not parse RGB from: ${s}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export class TokenEconomicsPage {
  readonly page: Page;

  readonly figure: Locator;
  readonly diagramShell: Locator;
  readonly expandButton: Locator;
  readonly dialog: Locator;
  readonly resultLabel: Locator;
  readonly redMeter: Locator;
  readonly greenMeter: Locator;
  readonly barsContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.figure = page.locator('[aria-label*="Token Economics"]');
    this.diagramShell = page.locator(".group").filter({
      has: page.locator("text=Token Economics"),
    });
    this.expandButton = this.diagramShell.locator('button[aria-label="Expand diagram"]');
    this.dialog = page.locator('[role="dialog"]');
    this.resultLabel = page.getByText("Result (tokens loaded)");
    this.redMeter = page.locator('[aria-label="Flat retrieval: 88,000 tokens"]');
    this.greenMeter = page.locator('[aria-label="MemPalace retrieval: 3,000 tokens"]');
    this.barsContainer = this.figure.locator(".overflow-hidden");
  }

  async goto(opts?: { freezeKeyframes?: boolean }) {
    await prepareContext(this.page, { freezeKeyframes: opts?.freezeKeyframes ?? true });
    await this.page.goto(BLOG_PATH);
    await stabilizeForLayout(this.page, { readyLocator: this.figure });
    await this.figure.scrollIntoViewIfNeeded();
  }

  async expand() {
    await this.expandButton.click();
    await expect(this.dialog).toBeVisible();
    await this.page.waitForTimeout(500);
  }

  async collapse() {
    await this.page.keyboard.press("Escape");
    await expect(this.dialog).not.toBeVisible();
  }

  root(expanded = false): Locator {
    return expanded ? this.dialog : this.figure;
  }

  queryTiles(expanded = false): Locator {
    return this.root(expanded).locator("div.rounded-lg").filter({ hasText: /^Query$/ });
  }

  stepByText(text: string, expanded = false): Locator {
    return this.root(expanded).locator("div.rounded-lg").filter({ hasText: text });
  }

  flowColumns(expanded = false): Locator {
    const container = expanded
      ? this.dialog.locator('[role="figure"]')
      : this.figure;
    return container.locator(":scope > div:first-child > div.flex-1");
  }

  alertIcon(expanded = false): Locator {
    return this.root(expanded).locator("svg.lucide-triangle-alert");
  }

  checkIcon(expanded = false): Locator {
    return this.root(expanded).locator("svg.lucide-circle-check-big");
  }

  meters(expanded = false): Locator {
    return this.root(expanded).locator('[role="meter"]');
  }

  barLabel(meter: Locator): Locator {
    return meter.locator("span.absolute");
  }

  async getColor(el: Locator, prop: "color" | "backgroundColor" | "borderColor"): Promise<[number, number, number]> {
    const raw = await el.evaluate(
      (e, p) => getComputedStyle(e)[p as keyof CSSStyleDeclaration] as string,
      prop,
    );
    return rgb(raw);
  }

  async getFontSize(el: Locator): Promise<number> {
    return el.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  }

  async getBoundingBoxes(locator: Locator): Promise<Array<{ x: number; y: number; width: number; height: number }>> {
    const count = await locator.count();
    const boxes = [];
    for (let i = 0; i < count; i++) {
      const box = await locator.nth(i).boundingBox();
      if (box) boxes.push(box);
    }
    return boxes;
  }

  async columnsAreSideBySide(expanded = false): Promise<boolean> {
    const boxes = await this.getBoundingBoxes(this.flowColumns(expanded));
    if (boxes.length < 2) return false;
    const verticalOverlap = Math.min(boxes[0].y + boxes[0].height, boxes[1].y + boxes[1].height) - Math.max(boxes[0].y, boxes[1].y);
    return verticalOverlap > boxes[0].height * 0.5;
  }

  async columnsAreStacked(expanded = false): Promise<boolean> {
    const boxes = await this.getBoundingBoxes(this.flowColumns(expanded));
    if (boxes.length < 2) return false;
    return boxes[1].y > boxes[0].y + boxes[0].height - 10;
  }
}

type TokenEconomicsFixtures = {
  tokenEconomics: TokenEconomicsPage;
};

export const test = base.extend<TokenEconomicsFixtures>({
  tokenEconomics: async ({ page }, use) => {
    const pom = new TokenEconomicsPage(page);
    await use(pom);
  },
});

export { expect };
