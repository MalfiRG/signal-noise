import { describe, it, expect, beforeEach } from "vitest";
import { setMockViewportWidth } from "./setup";

describe("matchMedia mock", () => {
  beforeEach(() => {
    setMockViewportWidth(1440);
  });

  it("returns matches=true when viewport is above min-width threshold", () => {
    setMockViewportWidth(1200);
    expect(window.matchMedia("(min-width: 768px)").matches).toBe(true);
    expect(window.matchMedia("(min-width: 1024px)").matches).toBe(true);
  });

  it("returns matches=false when viewport is below min-width threshold", () => {
    setMockViewportWidth(375);
    expect(window.matchMedia("(min-width: 768px)").matches).toBe(false);
    expect(window.matchMedia("(min-width: 1024px)").matches).toBe(false);
  });

  it("returns matches=true for tablet tier at min-width 768 but not 1024", () => {
    setMockViewportWidth(900);
    expect(window.matchMedia("(min-width: 768px)").matches).toBe(true);
    expect(window.matchMedia("(min-width: 1024px)").matches).toBe(false);
  });

  it("exposes addEventListener/removeEventListener spies for cleanup tests", () => {
    const mql = window.matchMedia("(min-width: 768px)");
    expect(typeof mql.addEventListener).toBe("function");
    expect(typeof mql.removeEventListener).toBe("function");
  });
});
