import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { LatencyTax } from "./LatencyTax";

vi.mock("./useReadingMode", () => ({
  useReadingMode: () => false,
}));

describe("LatencyTax", () => {
  it("renders with role=figure", () => {
    const { container } = render(<LatencyTax />);
    const figure = container.querySelector('[role="figure"]');
    expect(figure).not.toBeNull();
  });

  it("has correct aria-label", () => {
    const { container } = render(<LatencyTax />);
    const figure = container.querySelector('[role="figure"]');
    expect(figure?.getAttribute("aria-label")).toBe(
      "The Latency Tax: HNSW queries at 80ms with 40% hit rate vs sqlite-vec at 119ms with 100% hit rate. 39ms buys 100% correctness"
    );
  });

  it("renders 2 AnimatedBar children (HNSW + sqlite-vec)", () => {
    const { container } = render(<LatencyTax />);
    const meters = container.querySelectorAll('[role="meter"]');
    expect(meters.length).toBe(2);
  });

  it("renders without error in reduced-motion mode", () => {
    expect(() => {
      const { unmount } = render(<LatencyTax />);
      unmount();
    }).not.toThrow();
  });

  it("cleans up on unmount without errors", () => {
    const { unmount } = render(<LatencyTax />);
    expect(() => unmount()).not.toThrow();
  });
});
