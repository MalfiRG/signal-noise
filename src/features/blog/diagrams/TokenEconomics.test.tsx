import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TokenEconomics } from "./TokenEconomics";

describe("TokenEconomics", () => {
  it("renders with role=figure", () => {
    const { container } = render(<TokenEconomics />);
    const figure = container.querySelector('[role="figure"]');
    expect(figure).not.toBeNull();
  });

  it("has correct aria-label", () => {
    const { container } = render(<TokenEconomics />);
    const figure = container.querySelector('[role="figure"]');
    expect(figure?.getAttribute("aria-label")).toBe(
      "Token Economics: flat retrieval loads 88,000 tokens at 0.9% signal; MemPalace retrieval loads 3,000 tokens at 93% signal"
    );
  });

  it("renders 2 AnimatedBar children", () => {
    const { container } = render(<TokenEconomics />);
    const meters = container.querySelectorAll('[role="meter"]');
    expect(meters.length).toBe(2);
  });

  it("renders without error in reduced-motion mode", () => {
    expect(() => {
      const { unmount } = render(<TokenEconomics />);
      unmount();
    }).not.toThrow();
  });

  it("cleans up on unmount without errors", () => {
    const { unmount } = render(<TokenEconomics />);
    expect(() => unmount()).not.toThrow();
  });
});
