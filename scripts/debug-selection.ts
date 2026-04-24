/**
 * Playwright debug script — captures selected text in a code block.
 */

import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto("http://localhost:8080/blog/autonomous-qa-loop", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Scroll to first language code block and screenshot before selection
  await page.locator("code[class*='language']").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/sel-before.png" });
  console.log("Before screenshot: /tmp/sel-before.png");

  // Select all text in the first code[class*=language] element
  await page.evaluate(() => {
    const el = document.querySelector("code[class*='language']");
    if (!el) { console.error("no code element found"); return; }
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  });

  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/sel-active.png" });
  console.log("Active selection screenshot: /tmp/sel-active.png");

  // Inspect the token spans
  const info = await page.evaluate(() => {
    const el = document.querySelector("code[class*='language']") as HTMLElement;
    if (!el) return null;
    const spans = el.querySelectorAll("span.token");
    const firstSpan = spans[0] as HTMLElement | undefined;
    return {
      codeClass: el.className,
      spanCount: spans.length,
      firstSpanColor: firstSpan ? getComputedStyle(firstSpan).color : "n/a",
      firstSpanClass: firstSpan?.className ?? "n/a",
      codeBg: getComputedStyle(el).backgroundColor,
    };
  });

  console.log("\n--- Code element info ---");
  console.log(JSON.stringify(info, null, 2));

  await browser.close();
}

main().catch(console.error);
