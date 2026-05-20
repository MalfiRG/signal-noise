import { test as base, expect, type Page, type Locator } from "@playwright/test";
import { prepareContext, stabilizeForLayout } from "./visual-determinism";

export const BLOG_PATH = "/blog/mempalace-retrieval-economics";
export const MIGRATION_BLOG_PATH = "/blog/mempalace-sqlite-vec-migration";

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

export abstract class DiagramBasePage {
  readonly page: Page;
  readonly figure: Locator;
  readonly diagramShell: Locator;
  readonly expandButton: Locator;
  readonly dialog: Locator;

  protected blogPath: string;

  constructor(page: Page, ariaLabelSubstring: string, titleSubstring: string, blogPath = BLOG_PATH) {
    this.page = page;
    this.blogPath = blogPath;
    this.figure = page.locator(`[aria-label*="${ariaLabelSubstring}"]`);
    this.diagramShell = page.locator(".group").filter({
      has: page.locator(`text=${titleSubstring}`),
    });
    this.expandButton = this.diagramShell.locator('button[aria-label="Expand diagram"]');
    this.dialog = page.locator('[role="dialog"]');
  }

  async goto(opts?: { freezeKeyframes?: boolean }) {
    await prepareContext(this.page, { freezeKeyframes: opts?.freezeKeyframes ?? true });
    await this.page.goto(this.blogPath);
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

  meters(expanded = false): Locator {
    return this.root(expanded).locator('[role="meter"]');
  }

  barLabel(meter: Locator): Locator {
    return meter.locator("span.absolute");
  }

  alertIcon(expanded = false): Locator {
    return this.root(expanded).locator("svg.lucide-triangle-alert");
  }

  checkIcon(expanded = false): Locator {
    return this.root(expanded).locator("svg.lucide-circle-check-big");
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
}

export { base, expect };
