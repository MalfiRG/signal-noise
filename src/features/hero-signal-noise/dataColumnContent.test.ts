import { describe, it, expect } from "vitest";
import { generateDataColumnContent, DC_SEED, DC_LINE_COUNT } from "./dataColumnContent";

describe("dataColumnContent", () => {
  it("exports the versioned seed string", () => {
    expect(DC_SEED).toBe("dc-seed-v1");
  });

  it("generates the expected line count", () => {
    const content = generateDataColumnContent();
    const lines = content.split("\n");
    // Doubled output for seamless infinite scroll loop.
    expect(lines.length).toBe(DC_LINE_COUNT * 2);
  });

  it("uses only allowed alphabet characters", () => {
    const content = generateDataColumnContent();
    expect(content).toMatch(/^[0-9A-F.\-/#*\n]+$/);
  });

  it("is deterministic across calls (StrictMode-safe contract)", () => {
    const a = generateDataColumnContent();
    const b = generateDataColumnContent();
    expect(a).toBe(b);
  });

  it("first half equals second half (loop seam)", () => {
    const content = generateDataColumnContent();
    const lines = content.split("\n");
    const first = lines.slice(0, DC_LINE_COUNT).join("\n");
    const second = lines.slice(DC_LINE_COUNT).join("\n");
    expect(first).toBe(second);
  });
});
