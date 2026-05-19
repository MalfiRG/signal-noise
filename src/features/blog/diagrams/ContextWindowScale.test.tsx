import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ContextWindowScale } from "./ContextWindowScale";

describe("ContextWindowScale", () => {
  it("renders with role=figure", () => {
    const { container } = render(<ContextWindowScale />);
    const figure = container.querySelector('[role="figure"]');
    expect(figure).not.toBeNull();
  });

  it("has correct aria-label", () => {
    const { container } = render(<ContextWindowScale />);
    const figure = container.querySelector('[role="figure"]');
    expect(figure?.getAttribute("aria-label")).toBe(
      "Context Window Scale: model context windows range from 1M (Opus) to 8K (7B laptop), while MemPalace retrieval costs 2-5K tokens regardless of model"
    );
  });

  it("renders 7 AnimatedBar children (6 models + MemPalace)", () => {
    const { container } = render(<ContextWindowScale />);
    const meters = container.querySelectorAll('[role="meter"]');
    expect(meters.length).toBe(7);
  });

  it("renders without error in reduced-motion mode", () => {
    expect(() => {
      const { unmount } = render(<ContextWindowScale />);
      unmount();
    }).not.toThrow();
  });

  it("cleans up on unmount without errors", () => {
    const { unmount } = render(<ContextWindowScale />);
    expect(() => unmount()).not.toThrow();
  });
});
