import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useRef } from "react";

vi.mock("@/lib/motion", () => ({
  useMotionPolicy: vi.fn().mockReturnValue({ tier: "desktop", prefersReducedMotion: false, animationsDisabled: false }),
  // useHeroStaggerVariant returns a Variants object — match production shape.
  // This is an isolation seam — the production hook chain is exercised by
  // src/lib/motion.test.ts.
  useHeroStaggerVariant: vi.fn().mockReturnValue({
    hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7 } },
  }),
}));

import HeroSignalNoise from "./HeroSignalNoise";

function Wrapper(props: { phase: number; animationsDisabled?: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  return (
    <MemoryRouter>
      <HeroSignalNoise
        phase={props.phase}
        animationsDisabled={!!props.animationsDisabled}
        prefersReducedMotion={false}
        viewProjectsRef={ref}
      />
    </MemoryRouter>
  );
}

describe("HeroSignalNoise", () => {
  it("renders IdStrip + 3 headline rows + sub + CTAs at phase 3", () => {
    const { container, getByText } = render(<Wrapper phase={3} />);
    expect(container.querySelector(".id-strip")).not.toBeNull();
    expect(container.querySelector(".hero-h")).not.toBeNull();
    expect(container.querySelectorAll(".h-row").length).toBe(3);
    expect(getByText("VIEW PROJECTS")).toBeTruthy();
    expect(getByText("READ BLOG")).toBeTruthy();
  });

  it("renders the terminal line at phase >= 1 (placeholder at phase 0)", () => {
    const { container, rerender } = render(<Wrapper phase={0} />);
    expect(container.textContent?.replace(/ /g, " ")).toContain("INITIALIZING SYSTEM");
    expect(container.querySelector("p.opacity-0")).not.toBeNull();

    rerender(<Wrapper phase={1} />);
    expect(container.textContent?.replace(/ /g, " ")).toContain("INITIALIZING SYSTEM");
  });

  it("renders BUILD IT via LetterReveal at phase 2 (per-letter animation preserved)", () => {
    const { container } = render(<Wrapper phase={2} animationsDisabled={false} />);
    const buildRow = container.querySelector("[data-row='build']");
    // LetterReveal with `tag="span"` renders a `<span class="block">` wrapper.
    // The text is split into per-letter spans inside that wrapper.
    expect(buildRow?.querySelector(".block")).not.toBeNull();
    expect(buildRow?.textContent?.replace(/ /g, " ")).toContain("BUILD IT");
  });

  it("CTA wrap is inert before phase 3 and active at phase 3", () => {
    const { container, rerender } = render(<Wrapper phase={1} />);
    const wrap = container.querySelector("[data-cta-wrap]") as HTMLElement | null;
    expect(wrap).not.toBeNull();
    // React 19 boolean inert: present (or "") when true, omitted when false.
    // We test both presence and the truthy/falsy semantics.
    expect(wrap?.hasAttribute("inert") && wrap?.getAttribute("inert") !== "false").toBe(true);

    rerender(<Wrapper phase={3} />);
    expect(wrap?.hasAttribute("inert") && wrap?.getAttribute("inert") !== "false").toBe(false);
  });

  it("PROVE row gets hero-stamp-entrance only when phase>=2 AND motion is on", () => {
    const { container, rerender } = render(<Wrapper phase={1} animationsDisabled={false} />);
    const proveBefore = container.querySelector("[data-row='prove']");
    expect(proveBefore?.className).not.toContain("hero-stamp-entrance");

    rerender(<Wrapper phase={2} animationsDisabled={false} />);
    expect(container.querySelector("[data-row='prove']")?.className).toContain("hero-stamp-entrance");

    rerender(<Wrapper phase={2} animationsDisabled={true} />);
    expect(container.querySelector("[data-row='prove']")?.className).not.toContain("hero-stamp-entrance");
  });

  it("BREAK row gets hero-glitch-entrance only when phase>=2 AND motion is on", () => {
    const { container } = render(<Wrapper phase={2} animationsDisabled={false} />);
    expect(container.querySelector("[data-row='break']")?.className).toContain("hero-glitch-entrance");
  });
});
