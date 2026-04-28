import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/lib/motion", () => ({
  useMotionPolicy: vi.fn().mockReturnValue({ tier: "desktop", prefersReducedMotion: false, animationsDisabled: false }),
}));

import DataColumn from "./DataColumn";
import { useMotionPolicy } from "@/lib/motion";

describe("DataColumn", () => {
  it("renders a fixed-position .data-column with .dc-track child", () => {
    const { container } = render(<DataColumn />);
    const col = container.querySelector(".data-column");
    expect(col).not.toBeNull();
    expect(col?.querySelector(".dc-track")).not.toBeNull();
    expect(col?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies .motion-disabled when animationsDisabled", () => {
    // Note: mockReturnValueOnce assumes single-render. If StrictMode is enabled
    // for tests in the future, switch to mockReturnValue + beforeEach reset.
    (useMotionPolicy as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      tier: "mobile",
      prefersReducedMotion: true,
      animationsDisabled: true,
    });
    const { container } = render(<DataColumn />);
    expect(container.querySelector(".data-column")?.classList.contains("motion-disabled")).toBe(true);
  });

  it("renders pre-generated content (non-empty)", () => {
    const { container } = render(<DataColumn />);
    const track = container.querySelector(".dc-track");
    expect(track?.textContent?.length ?? 0).toBeGreaterThan(0);
  });
});
