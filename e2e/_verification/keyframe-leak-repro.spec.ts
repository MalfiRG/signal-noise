// TEMPORARY — Wave 2 verification of Playwright animations:"disabled" claim.
// Spec §0 root-cause #2: does toHaveScreenshot({ animations: "disabled" })
// pause CSS @keyframes on Playwright 1.58.2, or only WAAPI?
// Removed in Wave 3 (verification result recorded inline in the spec).
import { test, expect } from "@playwright/test";

test.describe("Keyframe pause verification", () => {
  // Disable retry — a retry could mask the verification signal by re-running
  // the test against the same buffers and falsely producing PASS on the retry.
  test.describe.configure({ retries: 0 });

  test("hero-glow keyframe state with animations:disabled", async ({ page }) => {
    // Plan said /skills + .affordance-pulse; but .affordance-pulse is only
    // rendered in BlogSidebar's mobile branch (BlogSidebar.tsx:38) and even
    // there is inside a Radix Sheet trigger that Playwright reports hidden.
    // Pivoted to .animate-hero-glow-slow on the homepage (Index.tsx:66) —
    // a reliably-visible 20s infinite CSS keyframe animation.
    await page.goto("/");
    const pulsing = page.locator(".animate-hero-glow-slow").first();
    await expect(pulsing).toBeVisible({ timeout: 10_000 });

    // Capture two screenshots 500ms apart, both with animations:"disabled".
    // If keyframes are paused, the buffers will be byte-identical.
    // If keyframes leak, they will differ.
    const buf1 = await pulsing.screenshot({ animations: "disabled" });
    await page.waitForTimeout(500);
    const buf2 = await pulsing.screenshot({ animations: "disabled" });

    // Byte-equal comparison — no baseline file involved, no WSL2-vs-CI drift,
    // no flake from sub-pixel rendering differences (both buffers come from
    // the same browser instance milliseconds apart).
    if (buf1.equals(buf2)) {
      console.log("VERIFICATION RESULT: animations:disabled DOES pause CSS keyframes on Playwright 1.58.2");
    } else {
      console.log("VERIFICATION RESULT: animations:disabled does NOT pause CSS keyframes on Playwright 1.58.2");
    }
    expect(buf1.equals(buf2)).toBe(true);  // PASS = paused; FAIL = leaks
  });
});
