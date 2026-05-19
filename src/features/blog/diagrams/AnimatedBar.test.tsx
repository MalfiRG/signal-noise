import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AnimatedBar } from "./AnimatedBar";

const requiredProps = {
  value: 88000,
  maxValue: 100000,
  color: "#ff4444",
  labelColor: "#fff",
  subLabelColor: "#aaa",
  ariaLabel: "Flat retrieval: 88,000 tokens",
  animate: false,
};

describe("AnimatedBar", () => {
  it("renders with role=meter and correct ARIA attributes", () => {
    const { container } = render(<AnimatedBar {...requiredProps} />);
    const meter = container.querySelector('[role="meter"]');
    expect(meter).not.toBeNull();
    expect(meter?.getAttribute("aria-valuenow")).toBe("88000");
    expect(meter?.getAttribute("aria-valuemin")).toBe("0");
    expect(meter?.getAttribute("aria-valuemax")).toBe("100000");
  });

  it("renders sr-only span with final value when countUp is true", () => {
    const { container } = render(<AnimatedBar {...requiredProps} countUp />);
    const srOnly = container.querySelector(".sr-only");
    expect(srOnly).not.toBeNull();
    expect(srOnly?.textContent).toContain("88,000");
  });

  it("does not render sr-only span when countUp is false", () => {
    const { container } = render(<AnimatedBar {...requiredProps} />);
    const srOnly = container.querySelector(".sr-only");
    expect(srOnly).toBeNull();
  });

  it("displays label verbatim when provided (highest priority)", () => {
    const { container } = render(
      <AnimatedBar {...requiredProps} label="2-5K" countUp />
    );
    expect(container.textContent).toContain("2-5K");
  });

  it("displays formatted value when no label and no countUp", () => {
    const { container } = render(<AnimatedBar {...requiredProps} />);
    expect(container.textContent).toContain("88,000");
  });

  it("does not render when maxValue <= 0", () => {
    const { container } = render(
      <AnimatedBar {...requiredProps} maxValue={0} />
    );
    expect(container.querySelector('[role="meter"]')).toBeNull();
  });

  it("clamps proportional width but preserves real value in aria-valuenow", () => {
    const { container } = render(
      <AnimatedBar {...requiredProps} value={200000} maxValue={100000} />
    );
    const meter = container.querySelector('[role="meter"]');
    expect(meter).not.toBeNull();
    expect(meter?.getAttribute("aria-valuenow")).toBe("200000");
  });

  it("renders subLabel below the bar", () => {
    const { container } = render(
      <AnimatedBar {...requiredProps} subLabel="0.9% signal-to-noise" />
    );
    expect(container.textContent).toContain("0.9% signal-to-noise");
  });

  it("applies gradient when color is an object", () => {
    const { container } = render(
      <AnimatedBar
        {...requiredProps}
        color={{ from: "#00aa44", to: "#52e3c8" }}
      />
    );
    const meter = container.querySelector('[role="meter"]');
    expect(meter).not.toBeNull();
  });

  it("marks count-up number span as aria-hidden when countUp is true", () => {
    const { container } = render(
      <AnimatedBar {...requiredProps} countUp animate={true} />
    );
    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden).not.toBeNull();
  });
});
